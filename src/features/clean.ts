import { realpath } from 'node:fs/promises'
import path from 'node:path'
import { createDebug } from 'obug'
import { glob } from 'tinyglobby'
import { fsRemove } from '../utils/fs.ts'
import { slash } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import type { ResolvedConfig, UserConfig } from '../config/index.ts'
import type { OutputAsset, OutputChunk } from 'rolldown'

const debug = createDebug('tsdown:clean')

const RE_LAST_SLASH = /[/\\]$/

export async function cleanOutDir(configs: ResolvedConfig[]): Promise<void> {
  const removes = new Set<string>()
  const skipped = new Set<string>()

  for (const config of configs) {
    if (config.devtools && (config.devtools.clean ?? true)) {
      config.clean.push('node_modules/.rolldown')
    }

    if (config.exe) {
      const exeOutDir = path.resolve(config.cwd, config.exe.outDir || 'build')
      config.clean.push(exeOutDir)
    }

    if (!config.clean.length) continue
    const files = await glob(config.clean, {
      cwd: config.cwd,
      absolute: true,
      onlyFiles: false,
      dot: true,
    })

    const normalizedOutDir = config.outDir.replace(RE_LAST_SLASH, '')
    const realCwd = await realpath(config.cwd)
    const realDirs = new Map<string, Promise<string | undefined>>()
    for (const file of files) {
      const normalizedFile = file.replace(RE_LAST_SLASH, '')
      if (normalizedFile === normalizedOutDir) continue
      if (
        !isInsideDir(normalizedFile, config.cwd) ||
        !(await isRealPathInside(normalizedFile, realCwd, realDirs))
      ) {
        skipped.add(normalizedFile)
        continue
      }
      removes.add(file)
    }
  }

  if (skipped.size) {
    const shown = [...skipped].slice(0, 5).map((file) => `  - ${file}`)
    if (skipped.size > shown.length) {
      shown.push(`  ...and ${skipped.size - shown.length} more`)
    }
    globalLogger.warn(
      `Skipped cleaning ${skipped.size} path(s) outside the project root:\n${shown.join('\n')}`,
    )
  }
  if (!removes.size) return

  globalLogger.info(`Cleaning ${removes.size} files`)
  await Promise.all(
    [...removes].map(async (file) => {
      debug('Removing', file)
      await fsRemove(file)
    }),
  )
  debug('Removed %d files', removes.size)
}

/**
 * Checks the real location of `file` without following `file` itself, so a
 * symlink inside the root is removed as a link, but nothing is removed through
 * a symlinked parent directory.
 */
async function isRealPathInside(
  file: string,
  realCwd: string,
  realDirs: Map<string, Promise<string | undefined>>,
): Promise<boolean> {
  const dir = path.dirname(file)
  let realDir = realDirs.get(dir)
  if (!realDir) {
    realDir = realpath(dir).catch(() => undefined)
    realDirs.set(dir, realDir)
  }
  const resolved = await realDir
  return (
    !!resolved && isInsideDir(path.join(resolved, path.basename(file)), realCwd)
  )
}

function isInsideDir(file: string, dir: string): boolean {
  const relative = path.relative(dir, file)
  return (
    !!relative &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

export function resolveClean(
  clean: UserConfig['clean'],
  outDir: string,
  cwd: string,
): string[] {
  if (clean === true) {
    clean = [slash(outDir)]
  } else if (!clean) {
    clean = []
  }

  if (clean.some((item) => path.resolve(item) === cwd)) {
    throw new Error(
      'Cannot clean the current working directory. Please specify a different path to clean option.',
    )
  }

  return clean
}

export async function cleanChunks(
  outDir: string,
  chunks: Array<OutputAsset | OutputChunk>,
): Promise<void> {
  await Promise.all(
    chunks.map(async (chunk) => {
      const filePath = path.resolve(outDir, chunk.fileName)
      debug('Removing chunk file', filePath)
      await fsRemove(filePath)
    }),
  )
}
