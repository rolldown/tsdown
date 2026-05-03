import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { bold, dim, red } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS } from 'rolldown-plugin-dts/internal'
import satisfies from 'semver/functions/satisfies.js'
import { x } from 'tinyexec'
import { formatBytes } from '../utils/format.ts'
import { fsRemove, fsStat } from '../utils/fs.ts'
import { importWithError, typeAssert } from '../utils/general.ts'
import type { ResolvedConfig, RolldownChunk } from '../config/types.ts'
import type { ExeExtensionOptions, ExeTarget } from '@tsdown/exe'

export interface ExeOptions extends ExeExtensionOptions {
  seaConfig?: Omit<SeaConfig, 'main' | 'output' | 'mainFormat'>
  /**
   * Output file name without any suffix or extension.
   * For example, do not include `.exe`, platform suffixes, or architecture suffixes.
   */
  fileName?: string | ((chunk: RolldownChunk) => string)
  /**
   * Output directory for executables.
   * @default 'build'
   */
  outDir?: string
}

/**
 * See also [Node.js SEA Documentation](https://nodejs.org/api/single-executable-applications.html#generating-single-executable-applications-with---build-sea)
 *
 * Note some default values are different from Node.js defaults to optimize for typical use cases (e.g. disabling experimental warning, enabling code cache). These can be overridden.
 */
export interface SeaConfig {
  main?: string
  /**
   * Optional, if not specified, uses the current Node.js binary
   */
  executable?: string
  output?: string
  /**
   * @default tsdownConfig.format === 'es' ? 'module' : 'commonjs'
   */
  mainFormat?: 'commonjs' | 'module'
  /**
   * @default true
   */
  disableExperimentalSEAWarning?: boolean
  /**
   * @default false
   */
  useSnapshot?: boolean
  /**
   * @default false
   */
  useCodeCache?: boolean
  execArgv?: string[]
  /**
   * @default 'env'
   */
  execArgvExtension?: 'none' | 'env' | 'cli'
  assets?: Record<string, string>
}

const debug = createDebug('tsdown:exe')

export function validateSea({
  dts,
  entry,
  logger,
  nameLabel,
}: Omit<ResolvedConfig, 'clean' | 'format'>): void {
  if (process.versions.bun || process.versions.deno) {
    throw new Error(
      'The `exe` option is not supported in Bun and Deno environments.',
    )
  }

  if (!satisfies(process.version, '>=25.7.0')) {
    throw new Error(
      `Node.js version ${process.version} does not support \`exe\` option. Please upgrade to Node.js 25.7.0 or later.`,
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
  const { targets } = config.exe

  if (targets?.length) {
    if (config.exe.seaConfig?.executable) {
      config.logger.warn(
        config.nameLabel,
        '`seaConfig.executable` is ignored when `targets` is specified.',
      )
    }

    const { resolveNodeBinary, getTargetSuffix } =
      await importWithError<typeof import('@tsdown/exe')>('@tsdown/exe')

    for (const target of targets) {
      const nodeBinaryPath = await resolveNodeBinary(target, config.logger)
      const suffix = getTargetSuffix(target)
      const outputFile = resolveOutputFileName(
        config.exe,
        chunk,
        bundledFile,
        target,
        suffix,
      )
      await buildSingleExe(
        config,
        bundledFile,
        outputFile,
        nodeBinaryPath,
        target,
      )
    }
  } else {
    const outputFile = resolveOutputFileName(config.exe, chunk, bundledFile)
    await buildSingleExe(config, bundledFile, outputFile)
  }
}

function resolveOutputFileName(
  exe: ExeOptions,
  chunk: RolldownChunk,
  bundledFile: string,
  target?: ExeTarget,
  suffix?: string,
): string {
  let baseName: string
  if (exe.fileName) {
    baseName =
      typeof exe.fileName === 'function' ? exe.fileName(chunk) : exe.fileName
  } else {
    baseName = path.basename(bundledFile, path.extname(bundledFile))
  }

  if (suffix) {
    baseName += suffix
  }
  if (
    target?.platform ? target.platform === 'win' : process.platform === 'win32'
  ) {
    baseName += '.exe'
  }

  return baseName
}

async function buildSingleExe(
  config: ResolvedConfig,
  bundledFile: string,
  outputFile: string,
  executable?: string,
  target?: ExeTarget,
): Promise<void> {
  typeAssert(config.exe)
  const exe = config.exe
  const exeOutDir = path.resolve(config.cwd, exe.outDir || 'build')

  await mkdir(exeOutDir, { recursive: true })
  const outputPath = path.join(exeOutDir, outputFile)
  debug('Building SEA executable: %s -> %s', bundledFile, outputPath)

  const t = performance.now()

  // Create temp directory for sea-config.json
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tsdown-sea-'))

  try {
    const seaConfig: SeaConfig = {
      disableExperimentalSEAWarning: true,
      ...exe.seaConfig,
      main: bundledFile,
      output: outputPath,
      mainFormat: config.format === 'es' ? 'module' : 'commonjs',
    }
    if (executable) {
      seaConfig.executable = executable
    }

    const seaConfigPath = path.join(tempDir, 'sea-config.json')
    await writeFile(seaConfigPath, JSON.stringify(seaConfig))
    debug('Wrote sea-config.json: %O -> %s', seaConfig, seaConfigPath)

    // Always use host node for --build-sea; the executable field controls the target binary
    debug('Running: %s --build-sea %s', process.execPath, seaConfigPath)
    await x(process.execPath, ['--build-sea', seaConfigPath], {
      nodeOptions: { stdio: ['ignore', 'ignore', 'inherit'] },
      throwOnError: true,
    })
  } finally {
    if (debug.enabled) {
      debug('Preserving temp directory for debugging: %s', tempDir)
    } else {
      await fsRemove(tempDir)
    }
  }

  // Ad-hoc codesign on macOS host for darwin-targeted executables
  if ((target?.platform || process.platform) === 'darwin') {
    try {
      await x('codesign', ['--sign', '-', outputPath], {
        nodeOptions: { stdio: 'inherit' },
        throwOnError: true,
      })
    } catch {
      config.logger.warn(
        config.nameLabel,
        `Failed to code-sign the executable. ${
          process.platform === 'darwin'
            ? `You can sign it manually using:\n  codesign --sign - "${outputPath}"`
            : `Automatic code signing is not supported on ${process.platform}.`
        }`,
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
