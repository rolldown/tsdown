import satisfies from 'semver/functions/satisfies.js'
import valid from 'semver/functions/valid.js'

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
   * The minimum required version is 25.7.0, which is when SEA support was added to Node.js.
   */
  nodeVersion:
    | (string & {})
    | 'latest'
    | 'latest-lts'
    | `${string}.${string}.${string}`
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

const NODE_DIST_INDEX_URL = 'https://nodejs.org/dist/index.json'

export async function resolveNodeVersion(nodeVersion: string): Promise<string> {
  if (nodeVersion === 'latest' || nodeVersion === 'latest-lts') {
    const response = await fetch(NODE_DIST_INDEX_URL)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Node.js releases: HTTP ${response.status} from ${NODE_DIST_INDEX_URL}`,
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

  const version = valid(nodeVersion)
  if (!version) {
    throw new Error(
      `Invalid Node.js version: ${nodeVersion}. ` +
        `Please provide a valid version string (e.g., "25.7.0").`,
    )
  }

  if (!satisfies(version, '>=25.7.0')) {
    throw new Error(
      `Node.js ${version} does not support SEA (Single Executable Applications). ` +
        `Required minimum version is 25.7.0. Please update the nodeVersion in your target configuration.`,
    )
  }

  return version
}

export function getTargetSuffix(target: ExeTarget): string {
  return `-${target.platform}-${target.arch}`
}
