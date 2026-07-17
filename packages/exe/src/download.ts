import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { chmod, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createDebug } from 'obug'
import { x } from 'tinyexec'
import { fsExists, fsRemove, type Logger } from 'tsdown/internal'
import { getCachedBinaryPath } from './cache.ts'
import {
  getArchiveExtension,
  getBinaryPathInArchive,
  getDownloadUrl,
  resolveNodeVersion,
  type ExeExtensionOptions,
  type ExeTarget,
} from './platform.ts'
import type { ReadableStream as WebReadableStream } from 'node:stream/web'

const debug = createDebug('tsdown:exe:download')

const shasumsManifestCache = new Map<string, Promise<Map<string, string>>>()

interface ExtractCommand {
  command: string
  args: string[]
}

export async function resolveNodeBinary(
  target: ExeTarget,
  options: ExeExtensionOptions,
  logger?: Logger,
): Promise<string> {
  debug('Resolving Node.js binary for target: %O', target)
  target.nodeVersion = await resolveNodeVersion(
    target.nodeVersion,
    options.nodeDistIndexUrl,
  )

  const cachedPath = getCachedBinaryPath(target)
  debug('Cache path: %s', cachedPath)

  if (await fsExists(cachedPath)) {
    debug('Cache hit: %s', cachedPath)
    logger?.info(
      `Using cached Node.js ${target.nodeVersion} for ${target.platform}-${target.arch}`,
    )
    return cachedPath
  }

  const url = await (options.getDownloadUrl ?? getDownloadUrl)(target)
  debug('Cache miss, downloading from: %s', url)
  logger?.info(
    `Downloading Node.js ${target.nodeVersion} for ${target.platform}-${target.arch}...`,
  )
  logger?.info(`  ${url}`)

  await mkdir(path.dirname(cachedPath), { recursive: true })

  const ext = getArchiveExtension(target.platform)
  const archivePath = `${cachedPath}.download.${ext}`

  await downloadArchive(url, archivePath, target.nodeVersion)

  try {
    await extractBinary(archivePath, cachedPath, target)

    if (target.platform !== 'win') {
      await chmod(cachedPath, 0o755)
    }

    debug('Binary cached at: %s', cachedPath)
    logger?.info(`Cached Node.js binary at: ${cachedPath}`)
  } finally {
    await fsRemove(archivePath)
  }

  return cachedPath
}

async function downloadArchive(
  url: string,
  archivePath: string,
  nodeVersion: string,
): Promise<void> {
  const archiveName = path.posix.basename(new URL(url).pathname)
  const expectedChecksum = await getExpectedArchiveChecksum(
    nodeVersion,
    archiveName,
  )
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to download Node.js binary: HTTP ${response.status} from ${url}`,
    )
  }
  if (!response.body) {
    throw new Error(
      `Failed to download Node.js binary: empty response from ${url}`,
    )
  }

  const tempArchivePath = `${archivePath}.tmp-${process.pid}-${Date.now()}`
  try {
    await pipeline(
      Readable.fromWeb(response.body as WebReadableStream<Uint8Array>),
      createWriteStream(tempArchivePath),
    )
    await verifyArchiveChecksum(tempArchivePath, expectedChecksum)
    await rename(tempArchivePath, archivePath)
  } catch (error) {
    await fsRemove(tempArchivePath)
    throw error
  }
}

async function getExpectedArchiveChecksum(
  nodeVersion: string,
  archiveName: string,
): Promise<string> {
  const checksums = await getShasumsManifest(nodeVersion)
  const checksum = checksums.get(archiveName)
  if (!checksum) {
    throw new Error(
      `Failed to find checksum for Node.js archive "${archiveName}" in SHASUMS256.txt.`,
    )
  }

  return checksum
}

async function getShasumsManifest(
  nodeVersion: string,
): Promise<Map<string, string>> {
  const cachedManifest = shasumsManifestCache.get(nodeVersion)
  if (cachedManifest) return cachedManifest

  const manifest = (async () => {
    const url = `https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Failed to download Node.js checksums: HTTP ${response.status} from ${url}`,
      )
    }

    const checksums = new Map<string, string>()
    const text = await response.text()
    for (const line of text.split(/\r?\n/)) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      const separatorIndex = trimmedLine.search(/\s/)
      if (separatorIndex === -1) continue

      const checksum = trimmedLine.slice(0, separatorIndex)
      if (!/^[a-f0-9]{64}$/i.test(checksum)) continue

      const archiveName = trimmedLine
        .slice(separatorIndex)
        .trimStart()
        .replace(/^\*/, '')
      if (!archiveName) continue

      checksums.set(archiveName, checksum.toLowerCase())
    }

    return checksums
  })()

  shasumsManifestCache.set(nodeVersion, manifest)

  try {
    return await manifest
  } catch (error) {
    shasumsManifestCache.delete(nodeVersion)
    throw error
  }
}

async function verifyArchiveChecksum(
  archivePath: string,
  expectedChecksum: string,
): Promise<void> {
  const hash = createHash('sha256')
  const stream = createReadStream(archivePath)
  for await (const chunk of stream) {
    hash.update(chunk)
  }

  const actualChecksum = hash.digest('hex')
  if (actualChecksum !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch for Node.js archive "${archivePath}": expected ${expectedChecksum}, received ${actualChecksum}.`,
    )
  }
}

async function extractBinary(
  archivePath: string,
  targetBinaryPath: string,
  target: ExeTarget,
): Promise<void> {
  const binaryInArchive = getBinaryPathInArchive(target)
  const outDir = path.dirname(targetBinaryPath)
  debug('Extracting %s from archive to %s', binaryInArchive, outDir)

  const { command, args } = getExtractCommand(
    archivePath,
    outDir,
    binaryInArchive,
    target,
  )
  try {
    await x(command, args, {
      nodeOptions: { stdio: 'inherit' },
      throwOnError: true,
    })
  } catch (error) {
    throw new Error(
      `Failed to extract Node.js archive with \`${command}\`. ` +
        `Please ensure \`${command}\` is installed and available in PATH.`,
      { cause: error },
    )
  }

  // tar --strip-components and unzip -j extract to outDir/node[.exe]
  // Rename if the final filename doesn't match.
  const extractedName = target.platform === 'win' ? 'node.exe' : 'node'
  const extractedPath = path.join(outDir, extractedName)
  if (extractedPath !== targetBinaryPath) {
    await rename(extractedPath, targetBinaryPath)
  }
}

export function getExtractCommand(
  archivePath: string,
  outDir: string,
  binaryInArchive: string,
  target: ExeTarget,
  hostPlatform: NodeJS.Platform = process.platform,
): ExtractCommand {
  if (target.platform === 'win') {
    if (hostPlatform === 'win32') {
      // Modern Windows has bsdtar that supports .zip.
      return {
        command: 'tar',
        args: [
          '-xf',
          archivePath,
          '-C',
          outDir,
          '--strip-components=1',
          binaryInArchive,
        ],
      }
    }

    return {
      command: 'unzip',
      args: ['-j', '-o', archivePath, binaryInArchive, '-d', outDir],
    }
  }

  // .tar.gz (darwin) or .tar.xz (linux)
  const decompressFlag = archivePath.endsWith('.tar.xz') ? 'J' : 'z'
  return {
    command: 'tar',
    args: [
      `-x${decompressFlag}f`,
      archivePath,
      '-C',
      outDir,
      '--strip-components=2',
      binaryInArchive,
    ],
  }
}
