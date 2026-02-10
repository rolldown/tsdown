import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { blue } from 'ansis'
import { createDefu } from 'defu'
import isInCi from 'is-in-ci'
import { createDebug } from 'obug'
import { resolveClean } from '../features/clean.ts'
import { resolveCssOptions } from '../features/css/index.ts'
import { resolveEntry } from '../features/entry.ts'
import { hasExportsTypes } from '../features/pkg/exports.ts'
import { resolveTarget } from '../features/target.ts'
import { resolveTsconfig } from '../features/tsconfig.ts'
import {
  matchPattern,
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
  ResolvedDepsConfig,
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
): Promise<ResolvedConfig[]> {
  let {
    entry,
    format = ['es'],
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
    removeNodeProtocol,
    nodeProtocol,
    cjsDefault = true,
    globImport = true,
    css,
    fixedExtension = platform === 'node',
    devtools = false,
    write = true,
    deps,
    // deprecated options
    external: legacyExternal,
    noExternal: legacyNoExternal,
    inlineOnly: legacyInlineOnly,
    skipNodeModulesBundle: legacySkipNodeModulesBundle,
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

  const resolvedEntry = await resolveEntry(logger, entry, cwd, color, nameLabel)
  if (dts == null) {
    dts = !!(pkg?.types || pkg?.typings || hasExportsTypes(pkg))
  }
  target = resolveTarget(logger, target, color, pkg, nameLabel)
  tsconfig = await resolveTsconfig(logger, tsconfig, cwd, color, nameLabel)
  // Resolve deps options with backward compat for deprecated top-level options
  let {
    neverBundle: depsNeverBundle,
    alwaysBundle: depsAlwaysBundle,
    onlyAllowBundle: depsOnlyAllowBundle,
    skipNodeModulesBundle: depsSkipNodeModulesBundle = false,
  } = deps || {}

  if (legacyExternal != null) {
    if (depsNeverBundle != null)
      throw new TypeError(
        '`external` is deprecated. Cannot be used with `deps.neverBundle`.',
      )
    logger.warn('`external` is deprecated. Use `deps.neverBundle` instead.')
    depsNeverBundle = legacyExternal
  }
  if (legacyNoExternal != null) {
    if (depsAlwaysBundle != null)
      throw new TypeError(
        '`noExternal` is deprecated. Cannot be used with `deps.alwaysBundle`.',
      )
    logger.warn('`noExternal` is deprecated. Use `deps.alwaysBundle` instead.')
    depsAlwaysBundle = legacyNoExternal
  }
  if (legacyInlineOnly != null) {
    if (depsOnlyAllowBundle != null)
      throw new TypeError(
        '`inlineOnly` is deprecated. Cannot be used with `deps.onlyAllowBundle`.',
      )
    logger.warn(
      '`inlineOnly` is deprecated. Use `deps.onlyAllowBundle` instead.',
    )
    depsOnlyAllowBundle = legacyInlineOnly
  }
  if (legacySkipNodeModulesBundle != null) {
    if (deps?.skipNodeModulesBundle != null)
      throw new TypeError(
        '`skipNodeModulesBundle` is deprecated. Cannot be used with `deps.skipNodeModulesBundle`.',
      )
    logger.warn(
      '`skipNodeModulesBundle` is deprecated. Use `deps.skipNodeModulesBundle` instead.',
    )
    depsSkipNodeModulesBundle = legacySkipNodeModulesBundle
  }

  if (typeof depsNeverBundle === 'string') {
    depsNeverBundle = resolveRegex(depsNeverBundle)
  }
  if (typeof depsAlwaysBundle === 'string') {
    depsAlwaysBundle = resolveRegex(depsAlwaysBundle)
  }

  publint = resolveFeatureOption(publint, {})
  attw = resolveFeatureOption(attw, {})
  exports = resolveFeatureOption(exports, {})
  unused = resolveFeatureOption(unused, {})
  report = resolveFeatureOption(report, {})
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

  if (fromVite) {
    const viteUserConfig = await loadViteConfig(
      fromVite === true ? 'vite' : fromVite,
      cwd,
      inlineConfig.configLoader,
    )
    if (viteUserConfig) {
      const viteAlias = viteUserConfig.resolve?.alias

      if ((Array.isArray as (arg: any) => arg is readonly any[])(viteAlias)) {
        throw new TypeError(
          'Unsupported resolve.alias in Vite config. Use object instead of array',
        )
      }
      if (viteAlias) {
        alias = { ...alias, ...viteAlias }
      }

      if (viteUserConfig.plugins) {
        plugins = [viteUserConfig.plugins as any, plugins]
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

  if (depsAlwaysBundle != null && typeof depsAlwaysBundle !== 'function') {
    const alwaysBundlePatterns = toArray(depsAlwaysBundle)
    depsAlwaysBundle = (id) => matchPattern(id, alwaysBundlePatterns)
  }
  if (depsSkipNodeModulesBundle && depsAlwaysBundle != null) {
    throw new TypeError(
      '`deps.skipNodeModulesBundle` and `deps.alwaysBundle` are mutually exclusive options and cannot be used together.',
    )
  }
  if (depsOnlyAllowBundle != null && depsOnlyAllowBundle !== false) {
    depsOnlyAllowBundle = toArray(depsOnlyAllowBundle)
  }

  const resolvedDeps: ResolvedDepsConfig = {
    neverBundle: depsNeverBundle,
    alwaysBundle: depsAlwaysBundle as ResolvedDepsConfig['alwaysBundle'],
    onlyAllowBundle:
      depsOnlyAllowBundle as ResolvedDepsConfig['onlyAllowBundle'],
    skipNodeModulesBundle: depsSkipNodeModulesBundle,
  }

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
    copy: publicDir || copy,
    css: resolveCssOptions(css),
    cwd,
    deps: resolvedDeps,
    devtools,
    dts,
    entry: resolvedEntry,
    env,
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
    report,
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

  const objectFormat = typeof format === 'object' && !Array.isArray(format)
  const formats = objectFormat
    ? (Object.keys(format) as Format[])
    : resolveComma(toArray<Format>(format, 'es'))
  return formats.map((fmt, idx): ResolvedConfig => {
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
  overrides: UserConfig,
): UserConfig
export function mergeConfig(
  defaults: InlineConfig,
  overrides: InlineConfig,
): InlineConfig
export function mergeConfig(
  defaults: InlineConfig,
  overrides: InlineConfig,
): InlineConfig {
  return defu(overrides, defaults)
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
