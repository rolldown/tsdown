import { execFileSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { bold, dim, green } from 'ansis'
import { createDebug } from 'obug'
import { formatBytes } from '../utils/format.ts'
import { fsRemove, fsStat } from '../utils/fs.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { RolldownChunk } from '../utils/chunks.ts'

const debug = createDebug('tsdown:exe')

export interface ExeOptions {
  /** Use V8 code cache for faster startup. @default true */
  useCodeCache?: boolean
  /** Use V8 snapshot for faster startup. @default false */
  useSnapshot?: boolean
}

const MIN_NODE_VERSION: [number, number, number] = [25, 5, 0]

function parseNodeVersion(version: string): [number, number, number] {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) return [0, 0, 0]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isNodeVersionSupported(): boolean {
  const [major, minor, patch] = parseNodeVersion(process.version)
  const [minMajor, minMinor, minPatch] = MIN_NODE_VERSION
  if (major !== minMajor) return major > minMajor
  if (minor !== minMinor) return minor > minMinor
  return patch >= minPatch
}

export function resolveExeName(config: ResolvedConfig): string {
  // Priority 1: --out-file / outFile config
  if (config.outFile) {
    return path.basename(config.outFile, path.extname(config.outFile))
  }

  // Priority 2: first entry key name
  const entryKeys = Object.keys(config.entry)
  if (entryKeys.length > 0) {
    return entryKeys[0]
  }

  // Fallback
  return 'app'
}

export async function buildExe(
  config: ResolvedConfig,
  chunks: RolldownChunk[],
): Promise<void> {
  if (!config.exe) return

  config.logger.warn(
    config.nameLabel,
    '`exe` format is experimental and may change in future releases.',
  )

  // Validate Node version
  if (!isNodeVersionSupported()) {
    throw new Error(
      `\`exe\` format requires Node.js >= ${MIN_NODE_VERSION.join('.')} (for \`--build-sea\` support). Current version: ${process.version}`,
    )
  }

  // Validate single entry
  const entryKeys = Object.keys(config.entry)
  if (entryKeys.length > 1) {
    throw new Error(
      `\`exe\` format requires exactly one entry point, but found ${entryKeys.length}: ${entryKeys.join(', ')}`,
    )
  }

  const t = performance.now()

  // Find the entry chunk
  const entryChunk = chunks.find(
    (chunk) => chunk.type === 'chunk' && chunk.isEntry,
  )
  if (!entryChunk) {
    throw new Error('No entry chunk found for SEA build')
  }

  const bundledFile = path.join(config.outDir, entryChunk.fileName)
  const exeName = resolveExeName(config)
  const outputPath = path.join(
    config.cwd,
    process.platform === 'win32' ? `${exeName}.exe` : exeName,
  )

  debug('Building SEA executable: %s -> %s', bundledFile, outputPath)

  const { useCodeCache = true, useSnapshot = false } = config.exe

  // Create temp directory for sea-config.json
  const tempDir = path.join(tmpdir(), `tsdown-sea-${Date.now()}`)
  await mkdir(tempDir, { recursive: true })

  try {
    const seaConfig: Record<string, unknown> = {
      main: bundledFile,
      output: outputPath,
      disableExperimentalSEAWarning: true,
      useCodeCache,
      useSnapshot,
    }

    const seaConfigPath = path.join(tempDir, 'sea-config.json')
    await writeFile(seaConfigPath, JSON.stringify(seaConfig))
    debug('Wrote sea-config.json: %O', seaConfig)

    // Build SEA using --build-sea (Node >= 25.5.0)
    execFileSync(process.execPath, ['--build-sea', seaConfigPath], {
      stdio: 'pipe',
    })

    // Ad-hoc codesign on macOS (required for Gatekeeper)
    if (process.platform === 'darwin') {
      try {
        execFileSync('codesign', ['--sign', '-', outputPath], {
          stdio: 'pipe',
        })
      } catch {
        config.logger.warn(
          config.nameLabel,
          `Failed to codesign the executable. You may need to sign it manually:\n  codesign --sign - ${outputPath}`,
        )
      }
    }

    // Clean up intermediate CJS files
    for (const chunk of chunks) {
      const chunkPath = path.join(config.outDir, chunk.fileName)
      if (chunkPath !== outputPath) {
        await rm(chunkPath, { force: true })
      }
    }

    // Remove empty outDir (staging directory)
    try {
      await rm(config.outDir, { recursive: false })
    } catch {
      // outDir not empty or already removed — ignore
    }

    // Report exe binary size
    const stat = await fsStat(outputPath)
    if (stat) {
      const sizeText = formatBytes(stat.size)
      config.logger.info(
        config.nameLabel,
        bold(path.relative(config.cwd, outputPath)),
        ` ${dim(sizeText!)}`,
      )
    }

    config.logger.success(
      config.nameLabel,
      `SEA executable: ${green(path.relative(config.cwd, outputPath))}`,
      dim`(${Math.round(performance.now() - t)}ms)`,
    )
  } finally {
    await fsRemove(tempDir)
  }
}
