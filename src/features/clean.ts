import path from 'node:path'
import { createDebug } from 'obug'
import { glob } from 'tinyglobby'
import { fsRemove } from '../utils/fs.ts'
import { slash } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import { resolveCopyEntries } from './copy.ts'
import type { ResolvedConfig, UserConfig } from '../config/index.ts'
import type { RolldownChunk } from '../utils/chunks.ts'

const debug = createDebug('tsdown:clean')

const RE_LAST_SLASH = /[/\\]$/

/**
 * Directories that are wiped before emit when several one-shot builds share
 * the clean step. A single build, and every watch rebuild, uses
 * {@link cleanPreservingOutputs} instead so consumers never see an empty
 * output directory.
 */
export async function cleanOutDir(configs: ResolvedConfig[]): Promise<void> {
  const removes = new Set<string>()

  for (const config of configs) {
    ensureExtraCleanTargets(config)
    if (!config.clean.length) continue
    const files = await glob(config.clean, {
      cwd: config.cwd,
      absolute: true,
      onlyFiles: false,
      dot: true,
    })

    const outDir = normalizePath(config.outDir)
    for (const file of files) {
      const normalizedFile = normalizePath(file)
      if (normalizedFile !== outDir) {
        removes.add(normalizedFile)
      }
    }
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
 * Delete clean targets that this build did not emit.
 *
 * Emitted files are left in place (Rolldown overwrites them). Anything matched
 * by `clean` that is not part of the new output is removed only after that
 * output is on disk.
 */
export async function cleanPreservingOutputs(
  config: ResolvedConfig,
  chunks: readonly RolldownChunk[],
): Promise<void> {
  ensureExtraCleanTargets(config)
  if (!config.clean.length) return

  const preservedFiles = new Set(
    chunks.map((chunk) =>
      normalizePath(
        path.resolve(chunk.outDir || config.outDir, chunk.fileName),
      ),
    ),
  )
  if (config.copy) {
    const copied = await resolveCopyEntries(config)
    for (const entry of copied) preservedFiles.add(normalizePath(entry.to))
  }

  const preservedRoots = [normalizePath(config.outDir)]
  const matched = await glob(config.clean, {
    cwd: config.cwd,
    absolute: true,
    onlyFiles: false,
    dot: true,
  })
  const stale = matched
    .map((file) => normalizePath(file))
    .filter((file) => !isPreserved(file, preservedFiles, preservedRoots))
    // Deepest paths first so a directory is removed after its stale children.
    .toSorted((a, b) => b.length - a.length)

  if (!stale.length) return

  globalLogger.info(`Cleaning ${stale.length} files`)
  for (const file of stale) {
    debug('Removing', file)
    await fsRemove(file)
  }
  debug('Removed %d files', stale.length)
}

function ensureExtraCleanTargets(config: ResolvedConfig): void {
  if (config.devtools && (config.devtools.clean ?? true)) {
    const target = 'node_modules/.rolldown'
    if (!config.clean.includes(target)) config.clean.push(target)
  }

  if (!config.exe) return
  const exeOutDir = path.resolve(config.cwd, config.exe.outDir || 'build')
  if (!config.clean.includes(exeOutDir)) config.clean.push(exeOutDir)
}

function normalizePath(file: string): string {
  return path.resolve(file).replace(RE_LAST_SLASH, '')
}

function isPreserved(
  candidate: string,
  files: Set<string>,
  roots: readonly string[],
): boolean {
  if (files.has(candidate)) return true
  for (const root of roots) {
    if (candidate === root || root.startsWith(`${candidate}${path.sep}`)) {
      return true
    }
  }
  for (const file of files) {
    if (file.startsWith(`${candidate}${path.sep}`)) return true
  }
  return false
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
