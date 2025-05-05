import Debug from 'debug'
import { glob } from 'tinyglobby'
import { fsRemove } from '../utils/fs'
import { logger } from '../utils/logger'
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

  logger.info(`Cleaning ${removes.size} files`)
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
): string[] {
  if (clean === true) {
    clean = [outDir]
  } else if (!clean) {
    clean = []
  }
  return clean
}
