import { formatWithOptions } from 'node:util'
import { promiseWithResolvers } from '../../utils/general.ts'
import type { ResolvedConfig } from '../../config/types.ts'
import type { TsdownBundle } from '../../utils/chunks.ts'
import { attw } from './attw.ts'
import { mergeChunks, writeExports } from './exports.ts'
import { publint } from './publint.ts'

export type BundleByPkg = Record<
  string, // pkgPath
  {
    promise: Promise<void>
    resolve: () => void
    count: number
    bundles: TsdownBundle[]
  }
>

export function initBundleByPkg(configs: ResolvedConfig[]): BundleByPkg {
  const configChunksByPkg: BundleByPkg = {}

  for (const config of configs) {
    const pkg = config.pkg
    if (!pkg) continue
    if (!configChunksByPkg[pkg.packageJsonPath]) {
      const { promise, resolve } = promiseWithResolvers<void>()

      configChunksByPkg[pkg.packageJsonPath] = {
        promise,
        resolve: resolve!,
        count: 0,
        bundles: [],
      }
    }

    configChunksByPkg[pkg.packageJsonPath].count++
  }

  return configChunksByPkg
}

export async function bundleDone(
  bundleByPkg: BundleByPkg,
  bundle: TsdownBundle,
): Promise<void> {
  const pkg = bundle.config.pkg
  if (!pkg) return

  const ctx = bundleByPkg[pkg.packageJsonPath]
  ctx.bundles.push(bundle)

  if (ctx.bundles.length < ctx.count) {
    return ctx.promise
  }

  const configs = ctx.bundles.map(({ config }) => config)

  const exportsConfigs = dedupeConfigs(configs, 'exports')
  if (exportsConfigs.length) {
    if (exportsConfigs.length > 1) {
      throw new Error(
        `Conflicting exports options for package at ${pkg.packageJsonPath}. Please merge them:\n${exportsConfigs
          .map(
            (config) =>
              `- ${formatWithOptions({ colors: true }, config.exports)}`,
          )
          .join('\n')}`,
      )
    }

    const chunks = mergeChunks(
      ctx.bundles
        .filter(({ config }) => config.exports)
        .map(({ chunks }) => chunks),
    )
    await writeExports(exportsConfigs[0], chunks)
  }

  const publintConfigs = dedupeConfigs(configs, 'publint')
  const attwConfigs = dedupeConfigs(configs, 'attw')

  if (publintConfigs.length > 1 || attwConfigs.length > 1) {
    publintConfigs[1].logger.warn(
      `Multiple publint or attw configurations found for package at ${pkg.packageJsonPath}. Consider merging them for better consistency and performance.`,
    )
  }

  await Promise.all([
    ...publintConfigs.map((config) => publint(config)),
    ...attwConfigs.map((config) => attw(config)),
  ])

  ctx.resolve()
}

function dedupeConfigs<K extends 'publint' | 'attw' | 'exports'>(
  configs: Array<ResolvedConfig>,
  key: K,
): ResolvedConfig[] {
  const filtered = configs.filter((config) => config[key])
  if (!filtered.length) return []

  const results = [
    ...new Set(filtered.filter((config) => !!Object.keys(config[key]).length)),
  ]
  if (results.length === 0) {
    return [filtered[0]]
  }
  return results
}
