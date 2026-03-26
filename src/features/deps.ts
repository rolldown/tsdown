import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import path from 'node:path'
import { blue, underline, yellow } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS, RE_NODE_MODULES } from 'rolldown-plugin-dts/internal'
import { and, id, importerId, include } from 'rolldown/filter'
import {
  matchPattern,
  resolveRegex,
  slash,
  toArray,
  typeAssert,
} from '../utils/general.ts'
import { shimFile } from './shims.ts'
import type { ResolvedConfig, UserConfig } from '../config/types.ts'
import type { TsdownBundle } from '../utils/chunks.ts'
import type { Logger } from '../utils/logger.ts'
import type { Arrayable } from '../utils/types.ts'
import type { PackageJson } from 'pkg-types'
import type { ExternalOption, Plugin, ResolvedId } from 'rolldown'

const debug = createDebug('tsdown:deps')

export type NoExternalFn = (
  id: string,
  importer: string | undefined,
) => boolean | null | undefined | void

export interface DepsConfig {
  /**
   * Mark dependencies as external (not bundled).
   * Accepts strings, regular expressions, or Rolldown's `ExternalOption`.
   */
  neverBundle?: ExternalOption
  /**
   * Force dependencies to be bundled, even if they are in `dependencies`, `peerDependencies`, or `optionalDependencies`.
   */
  alwaysBundle?: Arrayable<string | RegExp> | NoExternalFn
  /**
   * Whitelist of dependencies allowed to be bundled from `node_modules`.
   * Throws an error if any unlisted dependency is bundled.
   *
   * - `undefined` (default): Show warnings for bundled dependencies.
   * - `false`: Suppress all warnings about bundled dependencies.
   *
   * Note: Be sure to include all required sub-dependencies as well.
   */
  onlyBundle?: Arrayable<string | RegExp> | false
  /**
   * @deprecated Use {@link onlyBundle} instead.
   */
  onlyAllowBundle?: Arrayable<string | RegExp> | false
  /**
   * Skip bundling all `node_modules` dependencies.
   *
   * **Note:** This option cannot be used together with `alwaysBundle`.
   *
   * @default false
   */
  skipNodeModulesBundle?: boolean
}

export interface ResolvedDepsConfig {
  neverBundle?: ExternalOption
  alwaysBundle?: NoExternalFn
  onlyBundle?: Array<string | RegExp> | false
  skipNodeModulesBundle: boolean
}

export function resolveDepsConfig(
  config: UserConfig,
  logger?: Logger,
): ResolvedDepsConfig {
  let {
    neverBundle,
    alwaysBundle,
    onlyBundle,
    skipNodeModulesBundle = false,
  } = config.deps || {}

  if (config.external != null) {
    if (neverBundle != null) {
      throw new TypeError(
        '`external` is deprecated. Cannot be used with `deps.neverBundle`.',
      )
    }
    logger?.warn('`external` is deprecated. Use `deps.neverBundle` instead.')
    neverBundle = config.external
  }
  if (config.noExternal != null) {
    if (alwaysBundle != null) {
      throw new TypeError(
        '`noExternal` is deprecated. Cannot be used with `deps.alwaysBundle`.',
      )
    }
    logger?.warn('`noExternal` is deprecated. Use `deps.alwaysBundle` instead.')
    alwaysBundle = config.noExternal
  }
  if (config.deps?.onlyAllowBundle != null) {
    if (onlyBundle != null) {
      throw new TypeError(
        '`deps.onlyAllowBundle` is deprecated. Cannot be used with `deps.onlyBundle`.',
      )
    }
    logger?.warn(
      '`deps.onlyAllowBundle` is deprecated. Use `deps.onlyBundle` instead.',
    )
    onlyBundle = config.deps.onlyAllowBundle
  }
  if (config.inlineOnly != null) {
    if (onlyBundle != null) {
      throw new TypeError(
        '`inlineOnly` is deprecated. Cannot be used with `deps.onlyBundle`.',
      )
    }
    logger?.warn('`inlineOnly` is deprecated. Use `deps.onlyBundle` instead.')
    onlyBundle = config.inlineOnly
  }
  if (config.skipNodeModulesBundle != null) {
    if (config.deps?.skipNodeModulesBundle != null) {
      throw new TypeError(
        '`skipNodeModulesBundle` is deprecated. Cannot be used with `deps.skipNodeModulesBundle`.',
      )
    }
    logger?.warn(
      '`skipNodeModulesBundle` is deprecated. Use `deps.skipNodeModulesBundle` instead.',
    )
    skipNodeModulesBundle = config.skipNodeModulesBundle
  }

  if (typeof neverBundle === 'string') {
    neverBundle = resolveRegex(neverBundle)
  }
  if (typeof alwaysBundle === 'string') {
    alwaysBundle = resolveRegex(alwaysBundle)
  }

  if (alwaysBundle != null && typeof alwaysBundle !== 'function') {
    const alwaysBundlePatterns = toArray(alwaysBundle)
    alwaysBundle = (id) => matchPattern(id, alwaysBundlePatterns)
  }
  if (skipNodeModulesBundle && alwaysBundle != null) {
    throw new TypeError(
      '`deps.skipNodeModulesBundle` and `deps.alwaysBundle` are mutually exclusive options and cannot be used together.',
    )
  }
  if (onlyBundle != null && onlyBundle !== false) {
    onlyBundle = toArray(onlyBundle)
  }

  return {
    neverBundle,
    alwaysBundle,
    onlyBundle,
    skipNodeModulesBundle,
  }
}

export function DepsPlugin(
  {
    pkg,
    deps: { alwaysBundle, onlyBundle, skipNodeModulesBundle },
    logger,
    nameLabel,
  }: ResolvedConfig,
  tsdownBundle: TsdownBundle,
): Plugin {
  const deps = pkg && Array.from(getProductionDeps(pkg))

  return {
    name: 'tsdown:deps',
    resolveId: {
      filter: [include(and(id(/^[^.]/), importerId(/./)))],
      async handler(id, importer, extraOptions) {
        if (extraOptions.isEntry) return
        typeAssert(importer)

        const resolved = await this.resolve(id, importer, {
          ...extraOptions,
          skipSelf: true,
        })
        let shouldExternal = await externalStrategy(id, importer, resolved)
        if (Array.isArray(shouldExternal)) {
          debug('custom resolved id for %o -> %o', id, shouldExternal[1])
          id = shouldExternal[1]
          shouldExternal = shouldExternal[0]
        }
        const nodeBuiltinModule = isBuiltin(id)
        const moduleSideEffects = nodeBuiltinModule ? false : undefined

        debug('shouldExternal: %o = %o', id, shouldExternal)

        if (shouldExternal === true || shouldExternal === 'absolute') {
          return {
            id,
            external: shouldExternal,
            moduleSideEffects,
          }
        }

        if (resolved) {
          return {
            ...resolved,
            moduleSideEffects,
          }
        }
      },
    },

    generateBundle: {
      order: 'post',
      async handler(options, bundle) {
        const deps = new Set<string>()
        const importers = new Map<string, Set<string>>()

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'asset') continue

          for (const id of chunk.moduleIds) {
            const parsed = await readBundledDepInfo(id)
            if (!parsed) continue

            deps.add(parsed.name)

            if (!tsdownBundle.inlinedDeps.has(parsed.pkgName)) {
              tsdownBundle.inlinedDeps.set(parsed.pkgName, new Set())
            }
            tsdownBundle.inlinedDeps.get(parsed.pkgName)!.add(parsed.version)

            const module = this.getModuleInfo(id)
            if (module) {
              importers.set(
                parsed.name,
                new Set([
                  ...module.importers,
                  ...(importers.get(parsed.name) || []),
                ]),
              )
            }
          }
        }

        debug('found deps in bundle: %o', deps)

        if (onlyBundle) {
          const errors = Array.from(deps)
            .filter((dep) => !matchPattern(dep, onlyBundle))
            .map(
              (dep) =>
                `${yellow(dep)} is located in ${blue`node_modules`} but is not included in ${blue`deps.onlyBundle`} option.\n` +
                `To fix this, either add it to ${blue`deps.onlyBundle`}, declare it as a production or peer dependency in your package.json, or externalize it manually.\n` +
                `Imported by\n${[...(importers.get(dep) || [])]
                  .map((s) => `- ${underline(s)}`)
                  .join('\n')}`,
            )
          if (errors.length) {
            this.error(errors.join('\n\n'))
          }

          const unusedPatterns = onlyBundle.filter(
            (pattern) =>
              !Array.from(deps).some((dep) => matchPattern(dep, [pattern])),
          )
          if (unusedPatterns.length) {
            logger.info(
              nameLabel,
              `The following entries in ${blue`deps.onlyBundle`} are not used in the bundle:\n${unusedPatterns
                .map((pattern) => `- ${yellow(pattern)}`)
                .join(
                  '\n',
                )}\nConsider removing them to keep your configuration clean.`,
            )
          }
        } else if (onlyBundle == null && deps.size) {
          logger.info(
            nameLabel,
            `Hint: consider adding ${blue`deps.onlyBundle`} option to avoid unintended bundling of dependencies, or set ${blue`deps.onlyBundle: false`} to disable this hint.\n` +
              `See more at ${underline`https://tsdown.dev/options/dependencies#deps-onlybundle`}\n` +
              `Detected dependencies in bundle:\n${Array.from(deps)
                .map((dep) => `- ${blue(dep)}`)
                .join('\n')}`,
          )
        }
      },
    },
  }

  /**
   * - `true`: always external
   * - `[true, resolvedId]`: external with custom resolved ID
   * - `false`: skip, let other plugins handle it
   * - `'absolute'`: external as absolute path
   * - `'no-external'`: skip, but mark as non-external for inlineOnly check
   */
  async function externalStrategy(
    id: string,
    importer: string | undefined,
    resolved: ResolvedId | null,
  ): Promise<boolean | [true, string] | 'absolute' | 'no-external'> {
    if (id === shimFile) return false

    if (alwaysBundle?.(id, importer)) {
      return 'no-external'
    }

    if (
      skipNodeModulesBundle &&
      resolved &&
      (resolved.external || RE_NODE_MODULES.test(resolved.id))
    ) {
      return true
    }

    if (deps) {
      if (deps.includes(id) || deps.some((dep) => id.startsWith(`${dep}/`))) {
        const resolvedDep = await resolveDepSubpath(id, resolved)
        return resolvedDep ? [true, resolvedDep] : true
      }

      if (importer && RE_DTS.test(importer) && !id.startsWith('@types/')) {
        const typesName = getTypesPackageName(id)
        if (typesName && deps.includes(typesName)) {
          return true
        }
      }
    }

    return false
  }
}

export function parsePackageSpecifier(
  id: string,
): [name: string, subpath: string] {
  const [first, second] = id.split('/', 3)

  const name = first[0] === '@' && second ? `${first}/${second}` : first
  const subpath = id.slice(name.length)

  return [name, subpath]
}

const NODE_MODULES = '/node_modules/'
export function parseNodeModulesPath(
  id: string,
): [name: string, subpath: string, root: string] | undefined {
  const slashed = slash(id)
  const lastNmIdx = slashed.lastIndexOf(NODE_MODULES)
  if (lastNmIdx === -1) return

  const afterNm = slashed.slice(lastNmIdx + NODE_MODULES.length)

  const [name, subpath] = parsePackageSpecifier(afterNm)
  const root = slashed.slice(0, lastNmIdx + NODE_MODULES.length + name.length)

  return [name, subpath, root]
}

async function readBundledDepInfo(
  moduleId: string,
): Promise<{ name: string; pkgName: string; version: string } | undefined> {
  const parsed = parseNodeModulesPath(moduleId)
  if (!parsed) return

  const [name, , root] = parsed

  try {
    const json = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8'),
    )
    return { name, pkgName: json.name, version: json.version }
  } catch {}
}

export function getTypesPackageName(id: string): string | undefined {
  const name = parsePackageSpecifier(id)[0]
  if (!name) return

  return `@types/${name.replace(/^@/, '').replace('/', '__')}`
}

async function resolveDepSubpath(id: string, resolved: ResolvedId | null) {
  if (!resolved?.packageJsonPath) return

  const parts = id.split('/')
  // ignore scope
  if (parts[0][0] === '@') parts.shift()
  // ignore no subpath or file imports
  if (parts.length === 1 || parts.at(-1)!.includes('.')) return

  let pkgJson: Record<string, any>
  try {
    pkgJson = JSON.parse(await readFile(resolved.packageJsonPath, 'utf8'))
  } catch {
    return
  }

  // no `exports` field
  if (pkgJson.exports) return

  const parsed = parseNodeModulesPath(resolved.id)
  if (!parsed) return

  const result = parsed[0] + parsed[1]
  if (result === id) return

  return result
}

/*
 * Production deps should be excluded from the bundle
 */
function getProductionDeps(pkg: PackageJson): Set<string> {
  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ])
}
