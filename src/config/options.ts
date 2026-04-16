import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { blue } from 'ansis'
import { createDefu } from 'defu'
import isInCi from 'is-in-ci'
import { createDebug } from 'obug'
import { resolveClean } from '../features/clean.ts'
import { resolveDepsConfig } from '../features/deps.ts'
import { resolveEntry } from '../features/entry.ts'
import { validateSea } from '../features/exe.ts'
import { hasExportsTypes } from '../features/pkg/exports.ts'
import { flattenPlugins } from '../features/plugin.ts'
import { resolveTarget } from '../features/target.ts'
import { resolveTsconfig } from '../features/tsconfig.ts'
import {
  pkgExists,
  resolveComma,
  resolveRegex,
  toArray,
} from '../utils/general.ts'
import { createLogger, generateColor, getNameLabel } from '../utils/logger.ts'
import { normalizeFormat, readPackageJson } from '../utils/package.ts'
import { loadViteConfig } from './file.ts'
import type { Awaitable } from '../utils/types.ts'
import type {
  CIOption,
  Format,
  InlineConfig,
  ResolvedConfig,
  UserConfig,
  WithEnabled,
} from './types.ts'

const debug = createDebug('tsdown:config:options')
const parseEnv = process.getBuiltinModule('node:util').parseEnv

/**
 * Resolve user config into resolved configs
 *
 * **Internal API, not for public use**
 * @private
 */
export async function resolveUserConfig(
  userConfig: UserConfig,
  inlineConfig: InlineConfig,
  configDeps: Set<string>,
): Promise<ResolvedConfig[]> {
  // Dispatch `tsdownConfig` hook on user plugins before any resolution work.
  // Plugins are snapshotted: new plugins added by a hook don't re-dispatch,
  // preventing infinite recursion and matching Vite's `config` semantics.
  {
    const flat = await flattenPlugins(userConfig.plugins)
    for (const plugin of flat) {
      const result = await plugin.tsdownConfig?.(userConfig, inlineConfig)
      if (result) {
        userConfig = mergeConfig(userConfig, result)
      }
    }
  }

  let {
    entry,
    format,
    plugins = [],
    clean = true,
    logLevel = 'info',
    failOnWarn = false,
    customLogger,
    treeshake = true,
    platform = 'node',
    outDir = 'dist',
    sourcemap = false,
    dts,
    unused = false,
    watch = false,
    ignoreWatch,
    shims = false,
    publint = false,
    attw = false,
    fromVite,
    alias,
    tsconfig,
    report = true,
    target,
    env = {},
    envFile,
    envPrefix = 'TSDOWN_',
    copy,
    publicDir,
    hash = true,
    cwd = process.cwd(),
    name,
    workspace,
    exports = false,
    bundle,
    unbundle = typeof bundle === 'boolean' ? !bundle : false,
    root,
    removeNodeProtocol,
    nodeProtocol,
    cjsDefault = true,
    globImport = true,
    css,
    injectStyle,
    fixedExtension = platform === 'node',
    devtools = false,
    write = true,
    exe = false,
  } = userConfig

  const pkg = await readPackageJson(cwd)
  if (workspace) {
    name ||= pkg?.name
  }
  const color = generateColor(name)
  const nameLabel = getNameLabel(color, name)

  if (!filterConfig(inlineConfig.filter, cwd, name)) {
    debug('[filter] skipping config %s', cwd)
    return []
  }

  const logger = createLogger(logLevel, {
    customLogger,
    failOnWarn: resolveFeatureOption(failOnWarn, true),
  })

  if (typeof bundle === 'boolean') {
    logger.warn('`bundle` option is deprecated. Use `unbundle` instead.')
  }

  if (removeNodeProtocol) {
    if (nodeProtocol)
      throw new TypeError(
        '`removeNodeProtocol` is deprecated. Please only use `nodeProtocol` instead.',
      )
    logger.warn(
      '`removeNodeProtocol` is deprecated. Use `nodeProtocol: "strip"` instead.',
    )
  }

  // Resolve nodeProtocol option with backward compatibility for removeNodeProtocol
  nodeProtocol =
    nodeProtocol ??
    // `removeNodeProtocol: true` means stripping the `node:` protocol which equals to `nodeProtocol: 'strip'`
    // `removeNodeProtocol: false` means keeping the `node:` protocol which equals to `nodeProtocol: false` (ignore it)
    (removeNodeProtocol ? 'strip' : false)

  outDir = path.resolve(cwd, outDir)
  clean = resolveClean(clean, outDir, cwd)

  const rawEntry = entry
  const [resolvedEntry, resolvedRoot] = await resolveEntry(
    logger,
    entry,
    cwd,
    color,
    nameLabel,
    root ? path.resolve(cwd, root) : undefined,
  )

  target = resolveTarget(logger, target, color, pkg, nameLabel)
  tsconfig = await resolveTsconfig(logger, tsconfig, cwd, color, nameLabel)

  publint = resolveFeatureOption(publint, {})
  attw = resolveFeatureOption(attw, {})
  exports = resolveFeatureOption(exports, {})
  unused = resolveFeatureOption(unused, {})
  report = resolveFeatureOption(report, {})

  exe = resolveFeatureOption(exe, {})

  if (dts == null) {
    dts = exe ? false : !!(pkg?.types || pkg?.typings || hasExportsTypes(pkg))
  }
  dts = resolveFeatureOption(dts, {})

  if (!pkg) {
    if (exports) {
      throw new Error('`package.json` not found, cannot write exports')
    }
    if (publint) {
      logger.warn(nameLabel, 'publint is enabled but package.json is not found')
    }
    if (attw) {
      logger.warn(nameLabel, 'attw is enabled but package.json is not found')
    }
  }

  if (injectStyle != null) {
    if (css?.inject == null) {
      logger.warn(
        `${blue`injectStyle`} is deprecated. Use ${blue`css.inject`} instead.`,
      )
      css = { ...css, inject: injectStyle }
    } else {
      throw new TypeError(
        '`injectStyle` is deprecated. Cannot be used with `css.inject`',
      )
    }
  }

  if (publicDir) {
    if (copy) {
      throw new TypeError(
        '`publicDir` is deprecated. Cannot be used with `copy`',
      )
    } else {
      logger.warn(
        `${blue`publicDir`} is deprecated. Use ${blue`copy`} instead.`,
      )
    }
  }

  envPrefix = toArray(envPrefix)
  if (envPrefix.includes('')) {
    logger.warn(
      '`envPrefix` includes an empty string; filtering is disabled. All environment variables from the env file and process.env will be injected into the build. Ensure this is intended to avoid accidental leakage of sensitive information.',
    )
  }
  const envFromProcess = filterEnv(process.env, envPrefix)
  if (envFile) {
    if (!parseEnv) {
      throw new Error(
        `Your runtime does not support 'util.parseEnv()'. Please upgrade to Node.js v20.12.0 or later.`,
      )
    }
    const resolvedPath = path.resolve(cwd, envFile)
    logger.info(nameLabel, `env file: ${color(resolvedPath)}`)

    const parsed = parseEnv(await readFile(resolvedPath, 'utf8'))
    const envFromFile = filterEnv(parsed, envPrefix)

    // precedence: env file < process.env < tsdown option
    env = { ...envFromFile, ...envFromProcess, ...env }
  } else {
    // precedence: process.env < tsdown option
    env = { ...envFromProcess, ...env }
  }
  debug(`Environment variables: %O`, env)

  configDeps = new Set(configDeps)

  if (fromVite) {
    const viteUserConfig = await loadViteConfig(
      fromVite === true ? 'vite' : fromVite,
      cwd,
      inlineConfig.configLoader,
    )
    if (viteUserConfig) {
      const { config, deps } = viteUserConfig
      deps?.forEach((dep) => configDeps.add(dep))

      const viteAlias = config.resolve?.alias
      if ((Array.isArray as (arg: any) => arg is readonly any[])(viteAlias)) {
        throw new TypeError(
          'Unsupported resolve.alias in Vite config. Use object instead of array',
        )
      }
      if (viteAlias) {
        alias = { ...alias, ...viteAlias }
      }

      if (config.plugins) {
        plugins = [config.plugins as any, plugins]
      }
    }
  }

  ignoreWatch = toArray(ignoreWatch).map((ignore) => {
    ignore = resolveRegex(ignore)
    if (typeof ignore === 'string') {
      return path.resolve(cwd, ignore)
    }
    return ignore
  })

  const depsConfig = resolveDepsConfig(userConfig, logger)

  devtools = resolveFeatureOption(devtools, {})
  if (devtools) {
    if (watch) {
      if (devtools.ui) {
        logger.warn('Devtools UI is not supported in watch mode, disabling it.')
      }
      devtools.ui = false
    } else {
      devtools.ui ??= !!pkgExists('@vitejs/devtools/cli')
    }
  }

  /// keep-sorted
  const config: Omit<ResolvedConfig, 'format'> = {
    ...userConfig,
    alias,
    attw,
    cjsDefault,
    clean,
    configDeps,
    copy: publicDir || copy,
    css,
    cwd,
    deps: depsConfig,
    devtools,
    dts,
    entry: resolvedEntry,
    env,
    exe,
    exports,
    fixedExtension,
    globImport,
    hash,
    ignoreWatch,
    logger,
    name,
    nameLabel,
    nodeProtocol,
    outDir,
    pkg,
    platform,
    plugins,
    publint,
    rawEntry,
    report,
    root: resolvedRoot,
    shims,
    sourcemap,
    target,
    treeshake,
    tsconfig,
    unbundle,
    unused,
    watch,
    write,
  }

  if (exe) {
    validateSea(config)
  }

  const objectFormat = typeof format === 'object' && !Array.isArray(format)
  const formats = objectFormat
    ? (Object.keys(format) as Format[])
    : resolveComma(toArray<Format>(format, 'esm'))

  const resolvedConfigs = formats.map((fmt, idx): ResolvedConfig => {
    const once = idx === 0
    const overrides = objectFormat ? format[fmt] : undefined
    return {
      ...config,
      // only copy once
      copy: once ? config.copy : undefined,
      // only execute once
      onSuccess: once ? config.onSuccess : undefined,
      format: normalizeFormat(fmt),
      ...overrides,
    }
  })

  // Dispatch `tsdownConfigResolved` hook. Re-flatten from the final plugin
  // list so plugins added during `tsdownConfig` (via fromVite or in-place
  // mutation) still participate. Fires once per resolved format.
  for (const resolved of resolvedConfigs) {
    const finalPlugins = await flattenPlugins(resolved.plugins)
    for (const plugin of finalPlugins) {
      await plugin.tsdownConfigResolved?.(resolved)
    }
  }

  return resolvedConfigs
}

/** filter env variables by prefixes */
function filterEnv(
  envDict: Record<string, string | undefined>,
  envPrefixes: string[],
) {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(envDict)) {
    if (value != null && envPrefixes.some((prefix) => key.startsWith(prefix))) {
      env[key] = value
    }
  }
  return env
}

const defu = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = value
    return true
  }
})

export function mergeConfig(
  defaults: UserConfig,
  ...overrides: UserConfig[]
): UserConfig
export function mergeConfig(
  defaults: InlineConfig,
  ...overrides: InlineConfig[]
): InlineConfig
export function mergeConfig(
  defaults: InlineConfig,
  ...overrides: InlineConfig[]
): InlineConfig {
  return defu(
    // @ts-expect-error - defu does not handle overloads well
    ...overrides.toReversed(),
    defaults,
  )
}

export async function mergeUserOptions<T extends object, A extends unknown[]>(
  defaults: T,
  user:
    | T
    | undefined
    | null
    | ((options: T, ...args: A) => Awaitable<T | void | null>),
  args: A,
): Promise<T> {
  const userOutputOptions =
    typeof user === 'function' ? await user(defaults, ...args) : user
  if (!userOutputOptions) return defaults
  return defu(userOutputOptions, defaults)
}

export function resolveFeatureOption<T>(
  value: Exclude<WithEnabled<T>, undefined>,
  defaults: T,
): T | false {
  if (typeof value === 'object' && value !== null) {
    return resolveCIOption(value.enabled ?? true) ? value : false
  }
  return resolveCIOption(value) ? defaults : false
}

function resolveCIOption(value: boolean | CIOption): boolean {
  if (value === 'ci-only') return isInCi ? true : false
  if (value === 'local-only') return isInCi ? false : true
  return value
}

function filterConfig(
  filter: InlineConfig['filter'],
  configCwd: string,
  name?: string,
) {
  if (!filter) return true

  let cwd = path.relative(process.cwd(), configCwd)
  if (cwd === '') cwd = '.'

  if (filter instanceof RegExp) {
    return (name && filter.test(name)) || filter.test(cwd)
  }

  return toArray(filter).some(
    (value) => (name && name === value) || cwd === value,
  )
}
