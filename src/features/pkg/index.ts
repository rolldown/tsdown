import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { formatWithOptions } from 'node:util'
import { x } from 'tinyexec'
import { fsRemove } from '../../utils/fs.ts'
import { promiseWithResolvers } from '../../utils/general.ts'
import { attw } from './attw.ts'
import { writeExports } from './exports.ts'
import { publint } from './publint.ts'
import type { ResolvedConfig } from '../../config/types.ts'
import type { ChunksByFormat, TsdownBundle } from '../../utils/chunks.ts'
import type { Arrayable } from '../../utils/types.ts'
import type { Buffer } from 'node:buffer'
import type { DetectResult } from 'package-manager-detector'

export interface BundleByPkg {
  [pkgPath: string]: {
    promise: Promise<void>
    resolve: () => void
    count: number
    formats: Set<string>
    bundles: TsdownBundle[]
  }
}

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
    const inlinedDeps = mergeInlinedDeps(ctx.bundles)
    for (const bundle of ctx.bundles) {
      if (!bundle.config.exports) continue

      chunks[bundle.config.format] ||= []
      chunks[bundle.config.format]!.push(...bundle.chunks)
    }

    await writeExports(exportsConfigs[0], chunks, inlinedDeps)
  }

  const publintConfigs = dedupeConfigs(configs, 'publint')
  const attwConfigs = dedupeConfigs(configs, 'attw')

  if (publintConfigs.length > 1 || attwConfigs.length > 1) {
    publintConfigs[1].logger.warn(
      `Multiple publint or attw configurations found for package at ${pkg.packageJsonPath}. Consider merging them for better consistency and performance.`,
    )
  }

  try {
    if (publintConfigs.length || attwConfigs.length) {
      const tarball = await packTarball(pkg.packageJsonPath)
      await Promise.all([
        ...publintConfigs.map((config) => publint(config, tarball)),
        ...attwConfigs.map((config) => attw(config, tarball)),
      ])
    }
  } catch (error) {
    configs[0].logger.error('Pack failed:', error)
  }

  ctx.resolve()
}

async function packTarball(
  packageJsonPath: string,
): Promise<Buffer<ArrayBuffer>> {
  const pkgDir = path.dirname(packageJsonPath)
  const destination = await mkdtemp(path.join(tmpdir(), 'tsdown-pack-'))
  const { detect } = await import('package-manager-detector/detect')

  try {
    const detected = await detect({ cwd: pkgDir })
    if (detected?.name === 'deno') {
      throw new Error(`Cannot pack tarball for Deno projects at ${pkgDir}`)
    }
    const tarballPath = await pack(pkgDir, detected, destination, true)
    return readFile(tarballPath)
  } finally {
    await fsRemove(destination)
  }
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

function mergeInlinedDeps(
  bundles: TsdownBundle[],
): Record<string, Arrayable<string>> | undefined {
  const merged = new Map<string, Set<string>>()
  for (const bundle of bundles) {
    for (const [pkgName, versions] of bundle.inlinedDeps) {
      if (!merged.has(pkgName)) {
        merged.set(pkgName, new Set())
      }
      for (const v of versions) {
        merged.get(pkgName)!.add(v)
      }
    }
  }
  if (!merged.size) return

  const sorted = [...merged.entries()].toSorted(([a], [b]) =>
    a.localeCompare(b),
  )

  const result: Record<string, Arrayable<string>> = {}
  for (const [pkgName, versions] of sorted) {
    result[pkgName] =
      versions.size === 1 ? [...versions][0] : [...versions].toSorted()
  }
  return result
}

// Copy from publint: https://github.com/publint/publint/blob/master/packages/pack/src/node/pack.js
// MIT License
async function pack(
  dir: string,
  pm: DetectResult | null,
  destination: string,
  ignoreScripts?: boolean,
) {
  pm ||= { name: 'npm', agent: 'npm' }

  if (pm.name === 'deno') {
    throw new Error(`Cannot pack tarball for Deno projects at ${dir}`)
  }

  const command: string = pm.name
  const args: string[] = ['pack']

  if (pm.name === 'bun') {
    args.unshift('pm')
  }

  // Handle tarball output
  const outFile = path.join(destination, 'package.tgz')
  if (destination) {
    switch (pm.agent) {
      case 'yarn':
        args.push('-f', outFile)
        break
      case 'yarn@berry':
        args.push('-o', outFile)
        break
      case 'bun':
        args.push('--destination', destination)
        break
      default:
        args.push('--pack-destination', destination)
        break
    }
  }

  // Handle ignore-scripts
  if (ignoreScripts) {
    switch (pm.agent) {
      case 'pnpm':
        args.push('--config.ignore-scripts=true')
        break
      case 'yarn@berry':
        // yarn berry does not support ignoring scripts
        break
      default:
        args.push('--ignore-scripts')
        break
    }
  }

  const output = await x(command, args, {
    nodeOptions: { cwd: dir },
  })

  // Get first file that ends with `.tgz` in the pack destination.
  // Also double-check against stdout as usually the package manager also prints
  // the tarball file name there, in case the directory has existing tarballs.
  const tarballFile = await readdir(destination).then((files) =>
    files.find((file) => file.endsWith('.tgz')),
  )
  if (!tarballFile) {
    throw new Error(
      `Failed to find packed tarball file in ${destination}. Command output:\n${JSON.stringify(output, null, 2)}`,
    )
  }

  return path.join(destination, tarballFile)
}
