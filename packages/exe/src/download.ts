import { Buffer } from 'node:buffer'
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createDebug } from 'obug'
import { x } from 'tinyexec'
import { fsExists, fsRemove, type Logger } from 'tsdown/internal'
import { getCachedBinaryPath } from './cache.ts'
import {
  getArchiveExtension,
  getBinaryPathInArchive,
  getDownloadUrl,
  resolveNodeVersion,
  type ExeTarget,
} from './platform.ts'

const debug = createDebug('tsdown:exe:download')

interface ExtractCommand {
  command: string
  args: string[]
  extractedName: string
  requiredTool: string
}

export async function resolveNodeBinary(
  target: ExeTarget,
  logger?: Logger,
): Promise<string> {
  debug('Resolving Node.js binary for target: %O', target)
  target.nodeVersion = await resolveNodeVersion(target.nodeVersion)

  const cachedPath = getCachedBinaryPath(target)
  debug('Cache path: %s', cachedPath)

  if (await fsExists(cachedPath)) {
    debug('Cache hit: %s', cachedPath)
    logger?.info(
      `Using cached Node.js ${target.nodeVersion} for ${target.platform}-${target.arch}`,
    )
    return cachedPath
  }

  const url = getDownloadUrl(target)
  debug('Cache miss, downloading from: %s', url)
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
  debug('Downloaded %d bytes, writing to: %s', buffer.length, archivePath)
  await writeFile(archivePath, buffer)

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

async function extractBinary(
  archivePath: string,
  targetBinaryPath: string,
  target: ExeTarget,
): Promise<void> {
  const binaryInArchive = getBinaryPathInArchive(target)
  const outDir = path.dirname(targetBinaryPath)
  debug('Extracting %s from archive to %s', binaryInArchive, outDir)

  const command = getExtractCommand(archivePath, binaryInArchive, outDir)
  try {
    await x(command.command, command.args, {
      nodeOptions: { stdio: 'inherit' },
      throwOnError: true,
    })
  } catch (error) {
    throw formatExtractToolError(error, command.requiredTool, archivePath)
  }

  // tar --strip-components extracts to outDir/node[.exe]
  // Rename if the final filename doesn't match
  const extractedPath = path.join(outDir, command.extractedName)
  if (extractedPath !== targetBinaryPath) {
    await rename(extractedPath, targetBinaryPath)
  }
}

export function getExtractCommand(
  archivePath: string,
  binaryInArchive: string,
  outDir: string,
  hostPlatform = process.platform,
): ExtractCommand {
  if (archivePath.endsWith('.zip')) {
    if (hostPlatform === 'win32') {
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
        extractedName: 'node.exe',
        requiredTool: 'tar',
      }
    }

    return {
      command: 'unzip',
      args: ['-o', '-j', archivePath, binaryInArchive, '-d', outDir],
      extractedName: 'node.exe',
      requiredTool: 'unzip',
    }
  }

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
    extractedName: 'node',
    requiredTool: 'tar',
  }
}

function formatExtractToolError(
  error: unknown,
  tool: string,
  archivePath: string,
): unknown {
  if (isCommandNotFoundError(error)) {
    return new Error(
      `Failed to extract Node.js archive ${archivePath}: required tool "${tool}" was not found. ` +
        `Install "${tool}" and retry.`,
      { cause: error },
    )
  }
  return error
}

function isCommandNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  if ('code' in error && error.code === 'ENOENT') {
    return true
  }

  if ('cause' in error) {
    const { cause } = error as { cause?: unknown }
    if (
      cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === 'ENOENT'
    ) {
      return true
    }
  }

  return false
}
