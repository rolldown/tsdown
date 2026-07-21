import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parseEnv } from 'node:util'
import { createDefu } from 'defu'
import { createDebug } from 'obug'
import { readTsconfig } from 'rolldown-plugin-dts/internal'
import { resolveClean } from '../features/clean.ts'
import { resolveDepsConfig } from '../features/deps.ts'
import { resolveEntry } from '../features/entry.ts'
import { validateSea } from '../features/exe.ts'
import { hasExportsTypes } from '../features/pkg/exports.ts'
import { flattenPlugins } from '../features/plugin.ts'
import { resolveTarget } from '../features/target.ts'
import { resolveTsconfig } from '../features/tsconfig.ts'
import { isInCI } from '../utils/ci.ts'
import {
  createConcurrencyExecutor,
  pkgExists,
  resolveComma,
  resolveRegex,
  toArray,
  type ConcurrencyExecutor,
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
  runBuild: ConcurrencyExecutor = createConcurrencyExecutor(),
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
    suppressWarnings,
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
    hash = true,
    cwd = process.cwd(),
    name,
    workspace,
    exports = false,
    unbundle = false,
    root,
    nodeProtocol = false,
    cjsDefault = true,
    globImport = true,
    css,
    outExtensions,
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
    suppressWarnings,
  })

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
    if (exe) {
      dts = false
    } else if (pkg?.types || pkg?.typings || hasExportsTypes(pkg?.exports)) {
      dts = true
    } else if (tsconfig) {
      const { config } = readTsconfig(tsconfig)
      dts = !!config.compilerOptions?.declaration
    } else {
      dts = false
    }
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

  envPrefix = toArray(envPrefix)
  if (envPrefix.includes('')) {
    logger.warn(
      '`envPrefix` includes an empty string; filtering is disabled. All environment variables from the env file and process.env will be injected into the build. Ensure this is intended to avoid accidental leakage of sensitive information.',
    )
  }
  const envFromProcess = filterEnv(process.env, envPrefix)
  if (envFile) {
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
    copy,
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
    outExtensions,
    pkg,
    platform,
    plugins,
    publint,
    rawEntry,
    report,
    root: resolvedRoot,
    runBuild,
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
      runBuild,
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

const defu = createDefu((obj, key, value, namespace) => {
  if (
    key === 'plugins' &&
    (namespace === '' ||
      namespace === 'inputOptions' ||
      namespace === 'outputOptions')
  ) {
    obj[key] = [].concat(obj[key], value) as any
    return true
  }

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
  if (!user) return defaults
  if (typeof user === 'function') {
    return (await user(defaults, ...args)) ?? defaults
  }
  return defu(user, defaults)
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
  if (value === 'ci-only') return isInCI()
  if (value === 'local-only') return !isInCI()
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
