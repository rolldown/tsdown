import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { bold, dim, red } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS } from 'rolldown-plugin-dts/filename'
import satisfies from 'semver/functions/satisfies.js'
import { x } from 'tinyexec'
import { formatBytes } from '../utils/format.ts'
import { fsRemove, fsStat } from '../utils/fs.ts'
import type { ResolvedConfig, RolldownChunk } from '../config/types.ts'

export interface ExeOptions {
  seaConfig?: Omit<SeaConfig, 'main' | 'output' | 'mainFormat'>
  fileName?: string | ((chunk: RolldownChunk) => string)
}

/**
 * See also [Node.js SEA Documentation](https://nodejs.org/api/single-executable-applications.html#generating-single-executable-applications-with---build-sea)
 *
 * Note some default values are different from Node.js defaults to optimize for typical use cases (e.g. disabling experimental warning, enabling code cache). These can be overridden.
 */
export interface SeaConfig {
  main?: string
  /** Optional, if not specified, uses the current Node.js binary */
  executable?: string
  output?: string
  mainFormat?: 'commonjs' | 'module'
  /** @default true */
  disableExperimentalSEAWarning?: boolean
  /** @default false */
  useSnapshot?: boolean
  /** @default false */
  useCodeCache?: boolean
  execArgv?: string[]
  /** @default "env" */
  execArgvExtension?: 'none' | 'env' | 'cli'
  assets?: Record<string, string>
}

const debug = createDebug('tsdown:exe')

export function validateSea({
  dts,
  entry,
  logger,
  nameLabel,
}: Omit<ResolvedConfig, 'format'>): void {
  if (process.versions.bun || process.versions.deno) {
    throw new Error(
      'The `exe` option is not supported in Bun and Deno environments.',
    )
  }

  if (!satisfies(process.version, '>=25.5.0')) {
    throw new Error(
      `Node.js version ${process.version} does not support \`exe\` option. Please upgrade to Node.js 25.5.0 or later.`,
    )
  }

  if (Object.keys(entry).length > 1) {
    throw new Error(
      `The \`exe\` feature currently only supports single entry points. Found entries:\n${JSON.stringify(entry, undefined, 2)}`,
    )
  }

  if (dts) {
    logger.warn(
      nameLabel,
      `Generating .d.ts files with \`exe\` option is not recommended since they won't be included in the executable. Consider separating your library and executable targets if you need type declarations.`,
    )
  }

  logger.info(
    nameLabel,
    '`exe` option is experimental and may change in future releases.',
  )
}

export async function buildExe(
  config: ResolvedConfig,
  chunks: RolldownChunk[],
): Promise<void> {
  if (!config.exe) return

  // Exclude dts chunks since SEA only supports a single entry point and dts chunks are not needed for the executable
  const filteredChunks = chunks.filter((chunk) => !RE_DTS.test(chunk.fileName))

  // Validate single chunk
  if (filteredChunks.length > 1) {
    throw new Error(
      `The 'exe' feature currently only supports single-chunk outputs. Found ${filteredChunks.length} chunks.\n` +
        `Chunks:\n${filteredChunks.map((c) => `- ${c.fileName}`).join('\n')}`,
    )
  }

  const chunk = filteredChunks[0]
  debug('Building executable with SEA for chunk:', chunk.fileName)

  const bundledFile = path.join(config.outDir, chunk.fileName)
  let outputFile: string
  if (config.exe.fileName) {
    outputFile =
      typeof config.exe.fileName === 'function'
        ? config.exe.fileName(chunk)
        : config.exe.fileName
  } else {
    outputFile = path.basename(bundledFile, path.extname(bundledFile))
    if (process.platform === 'win32') {
      outputFile += '.exe'
    }
  }

  const outputPath = path.join(config.outDir, outputFile)
  debug('Building SEA executable: %s -> %s', bundledFile, outputPath)

  const t = performance.now()

  // Create temp directory for sea-config.json
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tsdown-sea-'))

  try {
    const seaConfig: SeaConfig = {
      disableExperimentalSEAWarning: true,
      ...config.exe.seaConfig,
      main: bundledFile,
      output: outputPath,
      mainFormat: config.format === 'es' ? 'module' : 'commonjs',
    }

    const seaConfigPath = path.join(tempDir, 'sea-config.json')
    await writeFile(seaConfigPath, JSON.stringify(seaConfig))
    debug('Wrote sea-config.json: %O -> %s', seaConfig, seaConfigPath)

    // Build SEA using --build-sea (Node >= 25.5.0)
    await x(process.execPath, ['--build-sea', seaConfigPath], {
      nodeOptions: { stdio: 'pipe' },
    })
  } finally {
    await fsRemove(tempDir)
  }

  // Ad-hoc codesign on macOS (required for Gatekeeper)
  if (process.platform === 'darwin') {
    try {
      await x('codesign', ['--sign', '-', outputPath], {
        nodeOptions: { stdio: 'pipe' },
      })
    } catch {
      config.logger.warn(
        config.nameLabel,
        `Failed to codesign the executable. You may need to sign it manually:\n  codesign --sign - ${outputPath}`,
      )
    }
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
    `Built executable: ${red(path.relative(config.cwd, outputPath))}`,
    dim`(${Math.round(performance.now() - t)}ms)`,
  )
}
