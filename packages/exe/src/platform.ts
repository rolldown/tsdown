import {
  NODE_SEA_MIN_VERSION,
  NODE_SEA_MIN_VERSION_PARSED,
} from 'tsdown/internal'
import { isGreaterOrEqual, normalize, tryParse } from 'verkit'

export type ExePlatform = 'win' | 'darwin' | 'linux'
export type ExeArch = 'x64' | 'arm64'

export interface ExeTarget {
  platform: ExePlatform
  arch: ExeArch
  /**
   * Node.js version to use for the executable.
   *
   * Accepts a valid semver string (e.g., `"25.7.0"`), or the special values
   * `"latest"` / `"latest-lts"` which resolve the version automatically from
   * {@link https://nodejs.org/dist/index.json}.
   *
   * The minimum required version is 25.7.0, which is when ESM entry point
   * support was added to Node.js SEA.
   */
  nodeVersion:
    (string & {}) | 'latest' | 'latest-lts' | `${string}.${string}.${string}`
}

export interface ExeExtensionOptions {
  /**
   * Cross-platform targets for building executables.
   * Requires `@tsdown/exe` to be installed.
   * When specified, builds an executable for each target platform/arch combination.
   *
   * @example
   * ```ts
   * targets: [
   *   { platform: 'linux', arch: 'x64', nodeVersion: '25.7.0' },
   *   { platform: 'darwin', arch: 'arm64', nodeVersion: '25.7.0' },
   *   { platform: 'win', arch: 'x64', nodeVersion: '25.7.0' },
   * ]
   * ```
   */
  targets?: ExeTarget[]

  getDownloadUrl?: (target: ExeTarget) => string | Promise<string>

  /**
   * @default 'https://nodejs.org/dist/index.json'
   */
  nodeDistIndexUrl?: string
}

export function getArchiveExtension(platform: ExePlatform): string {
  if (platform === 'win') return 'zip'
  if (platform === 'linux') return 'tar.xz'
  return 'tar.gz'
}

export function getDownloadUrl(target: ExeTarget): string {
  const { platform, arch, nodeVersion } = target
  const ext = getArchiveExtension(platform)
  return `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-${platform}-${arch}.${ext}`
}

export function getBinaryPathInArchive(target: ExeTarget): string {
  const { platform, arch, nodeVersion } = target
  const dirName = `node-v${nodeVersion}-${platform}-${arch}`
  if (platform === 'win') {
    return `${dirName}/node.exe`
  }
  return `${dirName}/bin/node`
}

interface NodeRelease {
  version: string
  lts: string | false
}

export async function resolveNodeVersion(
  nodeVersion: string,
  nodeDistIndexUrl = 'https://nodejs.org/dist/index.json',
): Promise<string> {
  if (nodeVersion === 'latest' || nodeVersion === 'latest-lts') {
    const response = await fetch(nodeDistIndexUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Node.js releases: HTTP ${response.status} from ${nodeDistIndexUrl}`,
      )
    }

    const releases = (await response.json()) as NodeRelease[]

    const release =
      nodeVersion === 'latest'
        ? releases[0]
        : releases.find((r) => r.lts !== false)

    if (!release) {
      throw new Error(`No matching Node.js release found for "${nodeVersion}".`)
    }

    nodeVersion = release.version.replace(/^v/, '')
  }

  const version = tryParse(nodeVersion)
  if (!version) {
    throw new Error(
      `Invalid Node.js version: ${nodeVersion}. ` +
        `Please provide a valid version string (e.g., "25.7.0").`,
    )
  }

  if (!isGreaterOrEqual(version, NODE_SEA_MIN_VERSION_PARSED)) {
    throw new Error(
      `Node.js ${version} does not support SEA (Single Executable Applications). ` +
        `Required minimum version is ${NODE_SEA_MIN_VERSION}. Please update the nodeVersion in your target configuration.`,
    )
  }

  return normalize(version)!
}

export function getTargetSuffix(target: ExeTarget): string {
  return `-${target.platform}-${target.arch}`
}
