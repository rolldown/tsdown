import path from 'node:path'
import Debug from 'debug'
import { glob } from 'tinyglobby'
import { fsRemove } from '../utils/fs'
import { slash } from '../utils/general'
import { globalLogger } from '../utils/logger'
import type { Options, ResolvedOptions } from '../options'

const debug = Debug('tsdown:clean')

const RE_LAST_SLASH = /[/\\]$/

export async function cleanOutDir(configs: ResolvedOptions[]): Promise<void> {
  const removes = new Set<string>()

  for (const config of configs) {
    if (!config.clean.length) continue
    const files = await glob(config.clean, {
      cwd: config.cwd,
      absolute: true,
      onlyFiles: false,
    })

    const normalizedOutDir = config.outDir.replace(RE_LAST_SLASH, '')
    for (const file of files) {
      const normalizedFile = file.replace(RE_LAST_SLASH, '')
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
  clean: Options['clean'],
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
