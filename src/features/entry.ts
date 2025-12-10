import path from 'node:path'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsExists, lowestCommonAncestor } from '../utils/fs.ts'
import { slash } from '../utils/general.ts'
import type { UserConfig } from '../config/index.ts'
import type { Logger } from '../utils/logger.ts'
import type { Ansis } from 'ansis'

export async function resolveEntry(
  logger: Logger,
  entry: UserConfig['entry'],
  cwd: string,
  color: Ansis,
  nameLabel?: string,
): Promise<Record<string, string>> {
  if (!entry || Object.keys(entry).length === 0) {
    const defaultEntry = path.resolve(cwd, 'src/index.ts')

    if (await fsExists(defaultEntry)) {
      entry = { index: defaultEntry }
    } else {
      throw new Error(
        `${nameLabel} No input files, try "tsdown <your-file>" or create src/index.ts`,
      )
    }
  }

  const entryMap = await toObjectEntry(entry, cwd)
  const entries = Object.values(entryMap)
  if (entries.length === 0) {
    throw new Error(`${nameLabel} Cannot find entry: ${JSON.stringify(entry)}`)
  }
  logger.info(
    nameLabel,
    `entry: ${color(entries.map((entry) => path.relative(cwd, entry)).join(', '))}`,
  )
  return entryMap
}

export async function toObjectEntry(
  entry: string | string[] | Record<string, string>,
  cwd: string,
): Promise<Record<string, string>> {
  if (typeof entry === 'string') {
    entry = [entry]
  }
  if (!Array.isArray(entry)) {
    return entry
  }

  const isGlob = entry.some((e) => isDynamicPattern(e))
  let resolvedEntry: string[]
  if (isGlob) {
    resolvedEntry = (
      await glob(entry, {
        cwd,
        expandDirectories: false,
        absolute: true,
      })
    ).map((file) => path.resolve(file))
  } else {
    resolvedEntry = entry
  }

  const base = lowestCommonAncestor(...resolvedEntry)
  return Object.fromEntries(
    resolvedEntry.map((file) => {
      const relative = path.relative(base, file)
      return [
        slash(
          relative.slice(0, relative.length - path.extname(relative).length),
        ),
        file,
      ]
    }),
  )
}
