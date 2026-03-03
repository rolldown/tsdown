import { Buffer } from 'node:buffer'
import { chmod, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { x } from 'tinyexec'
import { fsExists } from '../../../src/utils/fs.ts'
import { getCachedBinaryPath } from './cache.ts'
import {
  getArchiveExtension,
  getBinaryPathInArchive,
  getDownloadUrl,
  type ExeTarget,
} from './platform.ts'

export interface MinimalLogger {
  info: (...args: any[]) => void
}

export async function resolveNodeBinary(
  target: ExeTarget,
  logger?: MinimalLogger,
): Promise<string> {
  const cachedPath = getCachedBinaryPath(target)

  if (await fsExists(cachedPath)) {
    logger?.info(
      `Using cached Node.js ${target.nodeVersion} for ${target.platform}-${target.arch}`,
    )
    return cachedPath
  }

  const url = getDownloadUrl(target)
  logger?.info(
    `Downloading Node.js ${target.nodeVersion} for ${target.platform}-${target.arch}...`,
  )
  logger?.info(`  ${url}`)

  await mkdir(path.dirname(cachedPath), { recursive: true })

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to download Node.js binary: HTTP ${response.status} from ${url}`,
    )
  }

  const ext = getArchiveExtension(target.platform)
  const archivePath = `${cachedPath}.download.${ext}`

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(archivePath, buffer)

  try {
    await extractBinary(archivePath, cachedPath, target)

    if (target.platform !== 'win') {
      await chmod(cachedPath, 0o755)
    }

    logger?.info(`Cached Node.js binary at: ${cachedPath}`)
  } finally {
    await rm(archivePath, { force: true })
  }

  return cachedPath
}

async function extractBinary(
  archivePath: string,
  targetBinaryPath: string,
  target: ExeTarget,
): Promise<void> {
  const binaryInArchive = getBinaryPathInArchive(target)
  const outDir = path.dirname(targetBinaryPath)

  if (target.platform === 'win') {
    // Modern Windows has bsdtar that supports .zip
    await x(
      'tar',
      [
        '-xf',
        archivePath,
        '-C',
        outDir,
        '--strip-components=1',
        binaryInArchive,
      ],
      { nodeOptions: { stdio: 'pipe' } },
    )
  } else {
    // .tar.gz (darwin) or .tar.xz (linux)
    const decompressFlag = archivePath.endsWith('.tar.xz') ? 'J' : 'z'
    await x(
      'tar',
      [
        `-x${decompressFlag}f`,
        archivePath,
        '-C',
        outDir,
        '--strip-components=2',
        binaryInArchive,
      ],
      { nodeOptions: { stdio: 'pipe' } },
    )
  }

  // tar --strip-components extracts to outDir/node[.exe]
  // Rename if the final filename doesn't match
  const extractedName = target.platform === 'win' ? 'node.exe' : 'node'
  const extractedPath = path.join(outDir, extractedName)
  if (extractedPath !== targetBinaryPath) {
    await rename(extractedPath, targetBinaryPath)
  }
}
