import { readFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import path from 'node:path'
import process from 'node:process'
import { blue } from 'ansis'
import { createDefu } from 'defu'
import isInCi from 'is-in-ci'
import { createDebug } from 'obug'
import { resolveClean } from '../features/clean.ts'
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
import {
  createLogger,
  generateColor,
  getNameLabel,
} from '../utils/logger.ts'
import { normalizeFormat, readPackageJson } from '../utils/package.ts'
import type { Awaitable } from '../utils/types.ts'
import { loadViteConfig } from './file.ts'
import type {
  CIOption,
  Format,
  InlineConfig,
  ResolvedConfig,
  UserConfig,
  WithEnabled,
} from './types.ts'

const debugLog = createDebug('tsdown:config:options')

export async function resolveUserConfig(
  userConfig: UserConfig,
  inlineConfig: InlineConfig,
): Promise<ResolvedConfig[]> {
  let {
    entry,
    format = ['es'],
    plugins = [],
    clean = true,
    silent = false,
    logLevel = silent ? 'silent' : 'info',
    failOnWarn = 'ci-only',
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
    skipNodeModulesBundle = false,
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
    external,
    noExternal,
    exports = false,
    bundle,
    unbundle = typeof bundle === 'boolean' ? !bundle : false,
    removeNodeProtocol,
    nodeProtocol,
    cjsDefault = true,
    globImport = true,
    inlineOnly,
    fixedExtension = platform === 'node',
    debug = false,
    write = true,
  } = userConfig

  const pkg = await readPackageJson(cwd)
  if (workspace) {
    name ||= pkg?.name
  }
  const color = generateColor(name)
  const nameLabel = getNameLabel(color, name)

  if (!filterConfig(inlineConfig.filter, cwd, name)) {
    debugLog('[filter] skipping config %s', cwd)
    return []
  }

  const logger = createLogger(logLevel, {
    customLogger,
    failOnWarn: resolveFeatureOption(failOnWarn, true),
  })

  if (typeof bundle === 'boolean') {
    logger.warn('`bundle` option is deprecated. Use `unbundle` instead.')
  }

  if (removeNodeProtocol && nodeProtocol) {
    throw new TypeError(
      '`removeNodeProtocol` is deprecated. Please only use `nodeProtocol` instead.',
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
  if (typeof external === 'string') {
    external = resolveRegex(external)
  }
  if (typeof noExternal === 'string') {
    noExternal = resolveRegex(noExternal)
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
      'envPrefix includes an empty string; filtering is disabled. All environment variables from the env file and process.env will be injected into the build. Ensure this is intended to avoid accidental leakage of sensitive information.',
    )
  }
  const envFromProcess = filterEnv(process.env, envPrefix)

  if (envFile) {
    const resolvedPath = path.resolve(cwd, envFile)
    let parsed = parseEnv(await readFile(resolvedPath, 'utf-8'))
    const envFromFile = filterEnv(parsed, envPrefix)
    env = { ...envFromFile, ...envFromProcess, ...env } // precedence: explicit CLI option > process > file
    logger.info(
      nameLabel,
      `Loaded environment variables from ${color(resolvedPath)}`,
    )
  } else {
    env = { ...envFromProcess, ...env } // precedence: explicit CLI option > process
  }
  debugLog(
    `Marged environment variables: %O`,
    Object.entries(env).map(([k, v]) => `${k}=${v}`),
  )

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

  if (noExternal != null && typeof noExternal !== 'function') {
    const noExternalPatterns = toArray(noExternal)
    noExternal = (id) => matchPattern(id, noExternalPatterns)
  }
  if (inlineOnly != null) {
    inlineOnly = toArray(inlineOnly)
  }

  debug = resolveFeatureOption(debug, {})
  if (debug) {
    if (watch) {
      if (debug.devtools) {
        logger.warn('Devtools is not supported in watch mode, disabling it.')
      }
      debug.devtools = false
    } else {
      debug.devtools ??= !!pkgExists('@vitejs/devtools/cli')
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
    cwd,
    debug,
    dts,
    entry: resolvedEntry,
    env,
    exports,
    external,
    fixedExtension,
    globImport,
    hash,
    ignoreWatch,
    inlineOnly,
    logger,
    name,
    nameLabel,
    nodeProtocol,
    noExternal,
    outDir,
    pkg,
    platform,
    plugins,
    publint,
    report,
    shims,
    skipNodeModulesBundle,
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
function filterEnv(envDict: NodeJS.Dict<string>, envPrefixes: string[]) {
  const env: Record<string, string> = {}
  Object.entries(envDict).forEach(([key, value]) => {
    if (envPrefixes.some((prefix) => key.startsWith(prefix))) {
      value !== undefined && (env[key] = value)
    }
  })

  return env
}

const defu = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = value
    return true
  }
})

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
