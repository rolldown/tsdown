import path from 'node:path'
import { createDebug } from 'obug'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsRemove } from '../utils/fs.ts'
import { slash } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import type { ResolvedConfig, UserConfig } from '../config/index.ts'
import type { OutputAsset, OutputChunk } from 'rolldown'

const debug = createDebug('tsdown:clean')

const RE_LAST_SLASH = /[/\\]$/

export async function cleanOutDir(configs: ResolvedConfig[]): Promise<void> {
  const removes = new Set<string>()

  for (const config of configs) {
    if (config.devtools && (config.devtools.clean ?? true)) {
      config.clean.push('node_modules/.rolldown')
    }

    if (config.exe) {
      const exeOutDir = path.resolve(config.cwd, config.exe.outDir || 'build')
      config.clean.push(exeOutDir)
    }

    if (!config.clean.length) continue

    // Matching a literal `outDir` pattern from `cwd` makes the glob list `cwd`
    // itself, so list only the contents of `outDir` instead. Negated patterns
    // can exclude files inside `outDir`, so keep the combined glob for them.
    const outDir = path.resolve(config.outDir)
    const scopeToOutDir = config.clean.every(
      (pattern) => !pattern.startsWith('!'),
    )
    let cleansOutDir = false
    const patterns: string[] = []
    for (const pattern of config.clean) {
      if (
        scopeToOutDir &&
        !isDynamicPattern(pattern) &&
        path.resolve(config.cwd, pattern) === outDir
      ) {
        cleansOutDir = true
      } else {
        patterns.push(pattern)
      }
    }

    const globOptions = { absolute: true, onlyFiles: false, dot: true }
    const files: string[] = []
    if (cleansOutDir) {
      files.push(...(await glob('**', { ...globOptions, cwd: outDir })))
    }
    if (patterns.length) {
      files.push(...(await glob(patterns, { ...globOptions, cwd: config.cwd })))
    }

    // Glob results use forward slashes, so compare them in the same form
    const normalizedOutDir = slash(config.outDir).replace(RE_LAST_SLASH, '')
    for (const file of files) {
      const normalizedFile = slash(file).replace(RE_LAST_SLASH, '')
      if (normalizedFile !== normalizedOutDir) {
        removes.add(file)
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
