import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import type { ExeTarget } from './platform.ts'

export function getCacheDir(): string {
  const home = os.homedir()

  if (process.platform === 'win32') {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(home, 'AppData/Local')
    return path.join(localAppData, 'tsdown/Caches')
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library/Caches/tsdown')
  }
  const xdgCache = process.env.XDG_CACHE_HOME || path.join(home, '.cache')
  return path.join(xdgCache, 'tsdown')
}

export function getCachedBinaryPath(target: ExeTarget): string {
  const cacheDir = getCacheDir()
  const binName = target.platform === 'win' ? 'node.exe' : 'node'
  return path.join(
    cacheDir,
    'node',
    `v${target.nodeVersion}`,
    `${target.platform}-${target.arch}`,
    binName,
  )
}
