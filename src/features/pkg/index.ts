import { formatWithOptions } from 'node:util'
import { promiseWithResolvers } from '../../utils/general.ts'
import { attw } from './attw.ts'
import { writeExports } from './exports.ts'
import { publint } from './publint.ts'
import type { ResolvedConfig } from '../../config/types.ts'
import type { ChunksByFormat, TsdownBundle } from '../../utils/chunks.ts'

export type BundleByPkg = Record<
  string, // pkgPath
  {
    promise: Promise<void>
    resolve: () => void
    count: number
    formats: Set<string>
    bundles: TsdownBundle[]
  }
>

export function initBundleByPkg(configs: ResolvedConfig[]): BundleByPkg {
  const map: BundleByPkg = {}

  for (const config of configs) {
    const pkgJson = config.pkg?.packageJsonPath
    if (!pkgJson) continue

    if (!map[pkgJson]) {
      const { promise, resolve } = promiseWithResolvers<void>()
      map[pkgJson] = {
        promise,
        resolve,
        count: 0,
        formats: new Set<string>(),
        bundles: [],
      }
    }

    map[pkgJson].count++
    map[pkgJson].formats.add(config.format)
  }

  return map
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

    const chunks: ChunksByFormat = {}
    for (const bundle of ctx.bundles) {
      if (!bundle.config.exports) continue

      chunks[bundle.config.format] ||= []
      chunks[bundle.config.format]!.push(...bundle.chunks)
    }

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

  const seen = new Set<any>()
  const results = filtered.filter((config) => {
    if (!Object.keys(config[key]).length) {
      return false
    }
    if (seen.has(config[key])) {
      return false
    }
    seen.add(config[key])
    return true
  })

  if (results.length === 0) {
    return [filtered[0]]
  }
  return results
}
