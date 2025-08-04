import path from 'node:path'
import { glob } from 'tinyglobby'
import { fsExists, lowestCommonAncestor } from '../utils/fs'
import { generateColor, prettyName, type Logger } from '../utils/logger'
import type { Options } from '../options'

export async function resolveEntry(
  logger: Logger,
  entry: Options['entry'],
  cwd: string,
  name?: string,
): Promise<Record<string, string>> {
  const nameLabel = name ? `[${name}] ` : ''
  if (!entry || Object.keys(entry).length === 0) {
    const defaultEntry = path.resolve(cwd, 'src/index.ts')

    if (await fsExists(defaultEntry)) {
      entry = { index: defaultEntry }
    } else {
      throw new Error(
        `${nameLabel}No input files, try "tsdown <your-file>" or create src/index.ts`,
      )
    }
  }

  const entryMap = await toObjectEntry(entry, cwd)
  const entries = Object.values(entryMap)
  if (entries.length === 0) {
    throw new Error(`${nameLabel}Cannot find entry: ${JSON.stringify(entry)}`)
  }
  logger.info(
    prettyName(name),
    `entry: ${generateColor(name)(entries.map((entry) => path.relative(cwd, entry)).join(', '))}`,
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

  const resolvedEntry = (await glob(entry, { cwd })).map((file) =>
    path.resolve(cwd, file),
  )
  const base = lowestCommonAncestor(...resolvedEntry)
  return Object.fromEntries(
    resolvedEntry.map((file) => {
      const relative = path.relative(base, file)
      return [
        relative.slice(0, relative.length - path.extname(relative).length),
        file,
      ]
    }),
  )
}
