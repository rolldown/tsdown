import { isBuiltin } from 'node:module'
import { blue, underline, yellow } from 'ansis'
import { createDebug } from 'obug'
import { RE_NODE_MODULES } from 'rolldown-plugin-dts/filename'
import { and, id, importerId, include } from 'rolldown/filter'
import { matchPattern, slash, typeAssert } from '../utils/general.ts'
import { shimFile } from './shims.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { PackageJson } from 'pkg-types'
import type { Plugin, PluginContext, ResolveIdExtraOptions } from 'rolldown'

const debug = createDebug('tsdown:dep')

export function DepPlugin({
  pkg,
  noExternal,
  inlineOnly,
  skipNodeModulesBundle,
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
                      `${yellow(dep)} is located in ${blue`node_modules`} but is not included in ${blue`inlineOnly`} option.\n` +
                      `To fix this, either add it to ${blue`inlineOnly`}, declare it as a production or peer dependency in your package.json, or externalize it manually.\n` +
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
                  logger.warn(
                    nameLabel,
                    `The following entries in ${blue`inlineOnly`} are not used in the bundle:\n${unusedPatterns
                      .map((pattern) => `- ${yellow(pattern.toString())}`)
                      .join(
                        '\n',
                      )}\nConsider removing them to keep your configuration clean.`,
                  )
                }
              } else if (deps.size) {
                logger.warn(
                  nameLabel,
                  `Consider adding ${blue`inlineOnly`} option to avoid unintended bundling of dependencies, or set ${blue`inlineOnly: false`} to disable this warning.\n` +
                    `Detected dependencies in bundle:\n${Array.from(deps)
                      .map((dep) => `- ${yellow(dep)}`)
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

    if (noExternal?.(id, importer)) {
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

    if (
      deps &&
      (deps.includes(id) || deps.some((dep) => id.startsWith(`${dep}/`)))
    ) {
      return true
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
