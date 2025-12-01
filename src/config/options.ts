import path from 'node:path'
import process from 'node:process'
import { blue } from 'ansis'
import isInCi from 'is-in-ci'
import { createDebug } from 'obug'
import { resolveClean } from '../features/clean.ts'
import { resolveEntry } from '../features/entry.ts'
import { hasExportsTypes } from '../features/exports.ts'
import { resolveTarget } from '../features/target.ts'
import { resolveTsconfig } from '../features/tsconfig.ts'
import {
  matchPattern,
  pkgExists,
  resolveRegex,
  toArray,
} from '../utils/general.ts'
import { createLogger } from '../utils/logger.ts'
import { normalizeFormat, readPackageJson } from '../utils/package.ts'
import type { Awaitable } from '../utils/types.ts'
import { loadViteConfig } from './file.ts'
import type {
  CIOption,
  InlineConfig,
  ResolvedConfig,
  UserConfig,
  WithEnabled,
} from './types.ts'

const debugLog = createDebug('tsdown:config:options')

export async function resolveUserConfig(
  userConfig: UserConfig,
  inlineConfig: InlineConfig,
): Promise<ResolvedConfig | undefined> {
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

  if (!filterConfig(inlineConfig.filter, cwd, name)) {
    debugLog('[filter] skipping config %s', cwd)
    return
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

  entry = await resolveEntry(logger, entry, cwd, name)
  if (dts == null) {
    dts = !!(pkg?.types || pkg?.typings || hasExportsTypes(pkg))
  }
  target = resolveTarget(logger, target, pkg, name)
  tsconfig = await resolveTsconfig(logger, tsconfig, cwd, name)
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
  const config: ResolvedConfig = {
    ...userConfig,
    alias,
    attw,
    cjsDefault,
    clean,
    copy: publicDir || copy,
    cwd,
    debug,
    dts,
    entry,
    env,
    exports,
    external,
    fixedExtension,
    format: normalizeFormat(format),
    globImport,
    hash,
    ignoreWatch,
    inlineOnly,
    logger,
    name,
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

  return config
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
  return { ...defaults, ...userOutputOptions }
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
