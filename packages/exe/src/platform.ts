export type ExePlatform = 'win' | 'darwin' | 'linux'
export type ExeArch = 'x64' | 'arm64'

export interface ExeTarget {
  platform: ExePlatform
  arch: ExeArch
  nodeVersion: string
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
   *   { platform: 'linux', arch: 'x64', nodeVersion: '22.14.0' },
   *   { platform: 'darwin', arch: 'arm64', nodeVersion: '22.14.0' },
   *   { platform: 'win', arch: 'x64', nodeVersion: '22.14.0' },
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

export function getTargetSuffix(target: ExeTarget): string {
  return `${target.platform}-${target.arch}`
}
