import minVersion from 'semver/ranges/min-version.js'
import { resolveComma, toArray } from '../utils/general'
import { generateColor, prettyName, type Logger } from '../utils/logger'
import type { PackageJson } from 'pkg-types'

export function resolveTarget(
  logger: Logger,
  target: string | string[] | false | undefined,
  pkg?: PackageJson,
  name?: string,
): string[] | undefined {
  if (target === false) return
  if (target == null) {
    const pkgTarget = resolvePackageTarget(pkg)
    if (pkgTarget) {
      target = pkgTarget
    } else {
      return
    }
  }

  if (typeof target === 'number') {
    throw new TypeError(`Invalid target: ${target}`)
  }
  const targets = resolveComma(toArray(target))
  if (targets.length)
    logger.info(
      prettyName(name),
      `target${targets.length > 1 ? 's' : ''}: ${generateColor(name)(targets.join(', '))}`,
    )

  return targets
}

export function resolvePackageTarget(pkg?: PackageJson): string | undefined {
  const nodeVersion = pkg?.engines?.node
  if (!nodeVersion) return
  const nodeMinVersion = minVersion(nodeVersion)
  if (!nodeMinVersion) return
  if (nodeMinVersion.version === '0.0.0') return
  return `node${nodeMinVersion.version}`
}
