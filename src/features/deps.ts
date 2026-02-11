import { isBuiltin } from 'node:module'
import { blue, underline, yellow } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS, RE_NODE_MODULES } from 'rolldown-plugin-dts/filename'
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
import type { Logger } from '../utils/logger.ts'
import type { Arrayable } from '../utils/types.ts'
import type { PackageJson } from 'pkg-types'
import type {
  ExternalOption,
  Plugin,
  PluginContext,
  ResolveIdExtraOptions,
} from 'rolldown'

const debug = createDebug('tsdown:dep')

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
   * Force dependencies to be bundled, even if they are in `dependencies` or `peerDependencies`.
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
  onlyAllowBundle?: Array<string | RegExp> | false
  skipNodeModulesBundle: boolean
}

export function resolveDepsConfig(
  config: UserConfig,
  logger?: Logger,
): ResolvedDepsConfig {
  let {
    neverBundle,
    alwaysBundle,
    onlyAllowBundle,
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
  if (config.inlineOnly != null) {
    if (onlyAllowBundle != null) {
      throw new TypeError(
        '`inlineOnly` is deprecated. Cannot be used with `deps.onlyAllowBundle`.',
      )
    }
    logger?.warn(
      '`inlineOnly` is deprecated. Use `deps.onlyAllowBundle` instead.',
    )
    onlyAllowBundle = config.inlineOnly
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
  if (onlyAllowBundle != null && onlyAllowBundle !== false) {
    onlyAllowBundle = toArray(onlyAllowBundle)
  }

  return {
    neverBundle,
    alwaysBundle,
    onlyAllowBundle,
    skipNodeModulesBundle,
  }
}

export function DepPlugin({
  pkg,
  deps: { alwaysBundle, onlyAllowBundle: inlineOnly, skipNodeModulesBundle },
  logger,
  nameLabel,
}: ResolvedConfig): Plugin {
  const deps = pkg && Array.from(getProductionDeps(pkg))

  return {
    name: 'tsdown:external',
    resolveId: {
      filter: [include(and(id(/^[^.]/), importerId(/./)))],
      async handler(id, importer, extraOptions) {
        if (extraOptions.isEntry) return
        typeAssert(importer)

        const shouldExternal = await externalStrategy(
          this,
          id,
          importer,
          extraOptions,
        )
        const nodeBuiltinModule = isBuiltin(id)

        debug('shouldExternal: %o = %o', id, shouldExternal)

        if (shouldExternal === true || shouldExternal === 'absolute') {
          return {
            id,
            external: shouldExternal,
            moduleSideEffects: nodeBuiltinModule ? false : undefined,
          }
        }
      },
    },

    generateBundle:
      inlineOnly === false
        ? undefined
        : {
            order: 'post',
            handler(options, bundle) {
              const deps = new Set<string>()
              const importers = new Map<string, Set<string>>()

              for (const chunk of Object.values(bundle)) {
                if (chunk.type === 'asset') continue

                for (const id of chunk.moduleIds) {
                  if (!RE_NODE_MODULES.test(id)) continue

                  const parts = slash(id)
                    .split('/node_modules/')
                    .at(-1)
                    ?.split('/')
                  if (!parts) continue

                  let dep: string
                  if (parts[0][0] === '@') {
                    dep = `${parts[0]}/${parts[1]}`
                  } else {
                    dep = parts[0]
                  }
                  deps.add(dep)

                  const module = this.getModuleInfo(id)
                  if (module) {
                    importers.set(
                      dep,
                      new Set([
                        ...module.importers,
                        ...(importers.get(dep) || []),
                      ]),
                    )
                  }
                }
              }

              debug('found deps in bundle: %o', deps)

              if (inlineOnly) {
                const errors = Array.from(deps)
                  .filter((dep) => !matchPattern(dep, inlineOnly))
                  .map(
                    (dep) =>
                      `${yellow(dep)} is located in ${blue`node_modules`} but is not included in ${blue`deps.onlyAllowBundle`} option.\n` +
                      `To fix this, either add it to ${blue`deps.onlyAllowBundle`}, declare it as a production or peer dependency in your package.json, or externalize it manually.\n` +
                      `Imported by\n${[...(importers.get(dep) || [])]
                        .map((s) => `- ${underline(s)}`)
                        .join('\n')}`,
                  )
                if (errors.length) {
                  this.error(errors.join('\n\n'))
                }

                const unusedPatterns = inlineOnly.filter(
                  (pattern) =>
                    !Array.from(deps).some((dep) =>
                      matchPattern(dep, [pattern]),
                    ),
                )
                if (unusedPatterns.length) {
                  logger.info(
                    nameLabel,
                    `The following entries in ${blue`deps.onlyAllowBundle`} are not used in the bundle:\n${unusedPatterns
                      .map((pattern) => `- ${yellow(pattern)}`)
                      .join(
                        '\n',
                      )}\nConsider removing them to keep your configuration clean.`,
                  )
                }
              } else if (deps.size) {
                logger.info(
                  nameLabel,
                  `Hint: consider adding ${blue`deps.onlyAllowBundle`} option to avoid unintended bundling of dependencies, or set ${blue`deps.onlyAllowBundle: false`} to disable this hint.\n` +
                    `See more at ${underline`https://tsdown.dev/options/dependencies#deps-onlyallowbundle`}\n` +
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
   * - `false`: skip, let other plugins handle it
   * - `'absolute'`: external as absolute path
   * - `'no-external'`: skip, but mark as non-external for inlineOnly check
   */
  async function externalStrategy(
    context: PluginContext,
    id: string,
    importer: string | undefined,
    extraOptions: ResolveIdExtraOptions,
  ): Promise<boolean | 'absolute' | 'no-external'> {
    if (id === shimFile) return false

    if (alwaysBundle?.(id, importer)) {
      return 'no-external'
    }

    if (skipNodeModulesBundle) {
      const resolved = await context.resolve(id, importer, extraOptions)
      if (
        resolved &&
        (resolved.external || RE_NODE_MODULES.test(resolved.id))
      ) {
        return true
      }
    }

    if (deps) {
      if (deps.includes(id) || deps.some((dep) => id.startsWith(`${dep}/`))) {
        return true
      }

      if (importer && RE_DTS.test(importer) && !id.startsWith('@types/')) {
        const typesName = `@types/${id.replace(/^@/, '').replaceAll('/', '__')}`
        if (deps.includes(typesName)) {
          return true
        }
      }
    }

    return false
  }
}

/*
 * Production deps should be excluded from the bundle
 */
function getProductionDeps(pkg: PackageJson): Set<string> {
  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ])
}
