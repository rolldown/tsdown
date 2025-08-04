import { blue } from 'ansis'
import minVersion from 'semver/ranges/min-version.js'
import { resolveComma, toArray } from '../utils/general'
import { generateColor, prettyName, type Logger } from '../utils/logger'
import type { PackageJson } from 'pkg-types'
import type { Plugin } from 'rolldown'

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

let warned = false
export function RuntimeHelperCheckPlugin(
  logger: Logger,
  targets: string[],
): Plugin {
  return {
    name: 'tsdown:runtime-helper-check',
    resolveId: {
      filter: { id: /^@oxc-project\/runtime/ },
      async handler(id, ...args) {
        const EXTERNAL = { id, external: true }
        if (warned) return EXTERNAL

        const resolved = await this.resolve(id, ...args)
        if (!resolved) {
          if (!warned) {
            warned = true
            logger.warn(
              `The target environment (${targets.join(', ')}) requires runtime helpers from ${blue`@oxc-project/runtime`}. ` +
                `Please install it to ensure all necessary polyfills are included.\n` +
                `For more information, visit: https://tsdown.dev/options/target#runtime-helpers`,
            )
          }
          return EXTERNAL
        }
        return resolved
      },
    },
  }
}
