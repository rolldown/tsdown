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
 * Files each build last emitted, keyed by cwd + outDir + format.
 * A clean keeps the union, so ESM and CJS sharing one `outDir` do not
 * delete each other.
 */
const emittedByKey = new Map<string, { outDir: string; files: Set<string> }>()

/** Builds that have been asked to run and have not settled yet. */
const building = new Set<string>()

export function markBuilding(config: ResolvedConfig): void {
  building.add(outputKey(config))
}

/**
 * Record this build's outputs and clean once no other build is still
 * writing into the same directory.
 *
 * Pass no chunks when the build failed: the previous output stays protected.
 * Returns after a clean when this build was the last one in flight.
 */
export async function finishOutput(
  config: ResolvedConfig,
  chunks?: readonly RolldownChunk[],
): Promise<void> {
  const key = outputKey(config)
  if (chunks) {
    emittedByKey.set(outputKey(config), {
      outDir: normalizePath(config.outDir),
      files: await outputFiles(config, chunks),
    })
  }
  building.delete(key)

  if (!config.clean.length || isOutDirBusy(config)) return
  await cleanPreservingOutputs(config)
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
): Promise<void> {
  ensureExtraCleanTargets(config)
  if (!config.clean.length) return

  const outDir = normalizePath(config.outDir)
  const preservedFiles = new Set<string>()
  for (const emitted of emittedByKey.values()) {
    if (emitted.outDir !== outDir) continue
    for (const file of emitted.files) preservedFiles.add(file)
  }

  const preservedRoots = [outDir]
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

function outputKey(config: ResolvedConfig): string {
  return `${normalizePath(config.cwd)}\0${normalizePath(config.outDir)}\0${config.format}`
}

function isOutDirBusy(config: ResolvedConfig): boolean {
  const outDir = normalizePath(config.outDir)
  const cwd = normalizePath(config.cwd)
  for (const key of building) {
    const [otherCwd, otherOutDir] = key.split('\0', 2)
    if (otherCwd === cwd && otherOutDir === outDir) return true
  }
  return false
}

async function outputFiles(
  config: ResolvedConfig,
  chunks: readonly RolldownChunk[],
): Promise<Set<string>> {
  const files = new Set(
    chunks.map((chunk) =>
      normalizePath(
        path.resolve(chunk.outDir || config.outDir, chunk.fileName),
      ),
    ),
  )
  if (!config.copy) return files

  const copied = await resolveCopyEntries(config)
  for (const entry of copied) files.add(normalizePath(entry.to))
  return files
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
