import { readFile } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import path from 'node:path'
import { blue, underline, yellow } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS, RE_NODE_MODULES } from 'rolldown-plugin-dts/internal'
import { and, id, importerId, include } from 'rolldown/filter'
import { parse, Visitor, type ESTree } from 'rolldown/utils'
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

/**
 * Matches specifiers that follow npm package naming conventions,
 * e.g. `pkg`, `pkg/subpath`, `@scope/pkg/subpath`.
 */
const RE_PACKAGE_SPECIFIER =
  /^(?:@[a-z0-9-][a-z0-9-._]*\/)?[a-z0-9-][a-z0-9-._]*(?:\/|$)/

type ResolveFn = () => Promise<ResolvedId | null>

export type NoExternalFn = (
  id: string,
  importer: string | undefined,
) => boolean | null | undefined | void

export interface DepsConfig {
  /**
   * Mark dependencies as external (not bundled).
   * Accepts strings, regular expressions, or Rolldown's
   * {@linkcode ExternalOption}.
   *
   * Set to `true` to externalize **all** dependencies: every import that
   * follows npm package naming conventions is marked as external as written,
   * without resolving it. Other non-relative imports (e.g. `#` subpath
   * imports and path aliases like `~/`) are resolved, and kept external
   * only if they resolve into `node_modules`; otherwise the resolved local
   * file is bundled.
   *
   * Use {@linkcode alwaysBundle} to opt specific imports back into the bundle.
   */
  neverBundle?: true | ExternalOption
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
   * Whitelist of packages that the emitted output is allowed to import.
   * Matched against the package name, so subpath imports (e.g. `cac/deno`)
   * are covered by listing the package (e.g. `cac`).
   * Node built-in modules are always allowed to be imported
   * when `platform` is `node`.
   *
   * Note: ES imports and dynamic import expressions are checked. CJS
   * `require` calls are not detected.
   */
  onlyImport?: Arrayable<string | RegExp>
  /**
   * Skip bundling all `node_modules` dependencies.
   *
   * **Note:** This option cannot be used together with {@linkcode alwaysBundle}.
   *
   * @default false
   * @deprecated Use {@linkcode neverBundle | neverBundle: true} instead.
   */
  skipNodeModulesBundle?: boolean
  /**
   * Resolve dependency subpath imports to their actual package-relative paths
   * when externalizing packages without an `exports` field.
   *
   * @default false
   */
  resolveDepSubpath?: boolean

  /**
   * Override dependency bundling options for declaration file generation.
   */
  dts?: Pick<DepsConfig, 'alwaysBundle' | 'neverBundle'>
}

export interface ResolvedDepsConfig extends Pick<
  DepsConfig,
  'neverBundle' | 'skipNodeModulesBundle' | 'resolveDepSubpath'
> {
  alwaysBundle?: NoExternalFn
  onlyBundle?: Array<string | RegExp> | false
  onlyImport?: Array<string | RegExp>

  /**
   * Override dependency bundling options for declaration file generation.
   */
  dts: Pick<ResolvedDepsConfig, 'alwaysBundle' | 'neverBundle'>
}

export function resolveDepsConfig(
  config: UserConfig,
  logger?: Logger,
): ResolvedDepsConfig {
  let {
    neverBundle,
    alwaysBundle,
    onlyBundle,
    onlyImport,
    skipNodeModulesBundle,
    resolveDepSubpath,
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
      '`skipNodeModulesBundle` is deprecated. Use `deps.neverBundle: true` instead.',
    )
    skipNodeModulesBundle = config.skipNodeModulesBundle
  } else if (skipNodeModulesBundle != null) {
    logger?.warn(
      '`deps.skipNodeModulesBundle` is deprecated. Use `deps.neverBundle: true` instead.',
    )
  }

  if (skipNodeModulesBundle) {
    if (neverBundle === true) {
      throw new TypeError(
        '`deps.skipNodeModulesBundle` is deprecated. Cannot be used with `deps.neverBundle: true`.',
      )
    }
    if (alwaysBundle != null) {
      throw new TypeError(
        '`deps.skipNodeModulesBundle` and `deps.alwaysBundle` are mutually exclusive options and cannot be used together.',
      )
    }
  }

  if (onlyBundle != null && onlyBundle !== false) {
    onlyBundle = toArray(onlyBundle)
  }

  if (onlyImport != null) {
    onlyImport = toArray(onlyImport)
  }

  return {
    ...normalizeDepsOptions(alwaysBundle, neverBundle),
    onlyBundle,
    onlyImport,
    skipNodeModulesBundle,
    resolveDepSubpath,
    dts: normalizeDepsOptions(
      config.deps?.dts?.alwaysBundle,
      config.deps?.dts?.neverBundle,
    ),
  }
}

function normalizeDepsOptions(
  alwaysBundle?: DepsConfig['alwaysBundle'],
  neverBundle?: DepsConfig['neverBundle'],
): Pick<ResolvedDepsConfig, 'alwaysBundle' | 'neverBundle'> {
  if (alwaysBundle != null && typeof alwaysBundle !== 'function') {
    const alwaysBundlePatterns = toArray(alwaysBundle)
    alwaysBundle = (id) => matchPattern(id, alwaysBundlePatterns)
  }

  return {
    alwaysBundle,
    neverBundle: resolveRegex(neverBundle),
  }
}

export function DepsPlugin(
  {
    pkg,
    deps: {
      neverBundle,
      alwaysBundle: jsAlwaysBundle,
      onlyBundle,
      onlyImport,
      skipNodeModulesBundle,
      resolveDepSubpath: shouldResolveDepSubpath,
      dts,
    },
    logger,
    nameLabel,
    platform,
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

        let resolveResult: Promise<ResolvedId | null> | undefined
        const resolve: ResolveFn = () =>
          (resolveResult ??= this.resolve(id, importer, {
            ...extraOptions,
            skipSelf: true,
          }))

        let shouldExternal = await externalStrategy(id, importer, resolve)
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

        const resolved = await resolve()
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
        const errors: string[] = []
        const moduleIds = [...this.getModuleIds()].filter(
          (id) => platform !== 'node' || !isBuiltin(id),
        )

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'asset') continue

          // externalized deps
          if (
            onlyImport &&
            chunk.code &&
            // fast check to avoid parsing all chunks
            moduleIds.some((id) => chunk.code.includes(id))
          ) {
            const { program } = await parse(chunk.fileName, chunk.code)
            for (const source of collectImportSources(program)) {
              // relative imports of sibling chunks emitted by code splitting
              if (source[0] === '.') continue
              if (platform === 'node' && isBuiltin(source)) continue
              if (matchPattern(parsePackageSpecifier(source)[0], onlyImport)) {
                continue
              }

              errors.push(
                `${yellow(source)} is imported in ${blue(
                  chunk.fileName,
                )} but is not included in ${blue`deps.onlyImport`} option.\n` +
                  `To fix this, either add it to ${blue`deps.onlyImport`} or bundle it manually by adding it to ${blue`deps.alwaysBundle`} option.`,
              )
            }
          }
          // inlined deps
          for (const id of chunk.moduleIds) {
            if (id === shimFile) continue
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
          errors.push(
            ...Array.from(deps)
              .filter((dep) => !matchPattern(dep, onlyBundle))
              .map(
                (dep) =>
                  `${yellow(dep)} is located in ${blue`node_modules`} but is not included in ${blue`deps.onlyBundle`} option.\n` +
                  `To fix this, either add it to ${blue`deps.onlyBundle`}, declare it as a production or peer dependency in your package.json, or externalize it manually.\n` +
                  `Imported by\n${[...(importers.get(dep) || [])]
                    .map((s) => `- ${underline(s)}`)
                    .join('\n')}`,
              ),
          )
        }

        if (errors.length) {
          this.error(errors.join('\n\n'))
        }

        if (onlyBundle) {
          const unusedPatterns = onlyBundle.filter((pattern) =>
            Array.from(deps).every((dep) => !matchPattern(dep, [pattern])),
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
              `Detected dependencies in bundle:\n${Array.from(
                deps,
                (dep) => `- ${blue(dep)}`,
              ).join('\n')}`,
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
    importer: string,
    resolve: ResolveFn,
  ): Promise<boolean | [true, string] | 'absolute' | 'no-external'> {
    if (id === shimFile) return false

    const isDts = RE_DTS.test(importer)
    const alwaysBundle = (isDts && dts?.alwaysBundle) || jsAlwaysBundle
    if (alwaysBundle?.(id, importer)) {
      return 'no-external'
    }

    // `neverBundle: true`: imports that follow npm package naming
    // conventions are externalized as written, without resolving them.
    // Anything else (`#` subpath imports, path aliases like `~/` or `@/`)
    // may map to local files, so it is resolved and kept external only if
    // it lands in `node_modules`.
    const neverBundleAll =
      (isDts && dts?.neverBundle != null ? dts.neverBundle : neverBundle) ===
      true
    if (neverBundleAll) {
      // absolute paths and virtual modules are not dependencies
      if (id[0] === '\0' || id.startsWith('data:') || path.isAbsolute(id)) {
        return false
      }
      if (isBuiltin(id) || RE_PACKAGE_SPECIFIER.test(id)) {
        return true
      }
      const resolved = await resolve()
      return (
        !!resolved && (!!resolved.external || RE_NODE_MODULES.test(resolved.id))
      )
    }

    if (skipNodeModulesBundle) {
      const resolved = await resolve()
      if (
        resolved &&
        (resolved.external || RE_NODE_MODULES.test(resolved.id))
      ) {
        const resolvedDep =
          shouldResolveDepSubpath && (await resolveDepSubpath(id, resolve))
        return resolvedDep ? [true, resolvedDep] : true
      }
    }

    if (deps) {
      if (deps.includes(id) || deps.some((dep) => id.startsWith(`${dep}/`))) {
        const resolvedDep =
          shouldResolveDepSubpath && (await resolveDepSubpath(id, resolve))
        return resolvedDep ? [true, resolvedDep] : true
      }

      if (isDts && !id.startsWith('@types/')) {
        const typesName = getTypesPackageName(id)
        if (typesName && deps.includes(typesName)) {
          return true
        }
      }
    }

    return false
  }
}

function collectImportSources(program: ESTree.Program): string[] {
  const sources: string[] = []

  new Visitor({
    ImportDeclaration(node) {
      sources.push(node.source.value)
    },
    ExportAllDeclaration(node) {
      sources.push(node.source.value)
    },
    ExportNamedDeclaration(node) {
      if (node.source) sources.push(node.source.value)
    },
    ImportExpression(node) {
      const source = getStaticString(node.source)
      if (source) sources.push(source)
    },
  }).visit(program)

  return sources
}

function getStaticString(value: ESTree.Expression): string | undefined {
  if (value.type === 'Literal' && typeof value.value === 'string') {
    return value.value
  }

  if (value.type !== 'TemplateLiteral') return
  if (value.expressions.length || value.quasis.length !== 1) return

  const { cooked, raw } = value.quasis[0].value
  return cooked ?? raw
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

async function resolveDepSubpath(id: string, resolve: ResolveFn) {
  const parts = id.split('/')
  // ignore scope
  if (parts[0][0] === '@') parts.shift()
  // ignore no subpath or file imports
  if (parts.length === 1 || parts.at(-1)!.includes('.')) return

  const resolved = await resolve()
  if (!resolved?.packageJsonPath) return

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
    ...Object.keys(pkg.peerDependenciesMeta || {}),
    ...Object.keys(pkg.optionalDependencies || {}),
  ])
}
