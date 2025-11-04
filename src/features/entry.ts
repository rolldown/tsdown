import path from 'node:path'
import { glob } from 'tinyglobby'
import { fsExists, lowestCommonAncestor } from '../utils/fs.ts'
import { generateColor, prettyName, type Logger } from '../utils/logger.ts'
import type { UserConfig } from '../config/index.ts'

const DEFAULT_EXTENSIONS: string[] = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
  '.js',
  '.jsx',
  '.json',
]

function isGlobPattern(pattern: string): boolean {
  return /[*?[\]{}]/.test(pattern)
}

export async function inferEntryExtension(
  entryPath: string,
  cwd: string,
): Promise<string | null> {
  const resolvedPath = path.resolve(cwd, entryPath)

  if (await fsExists(resolvedPath)) return entryPath

  const ext = path.extname(entryPath)
  if (ext) return null

  // Try to infer extension by checking each valid extension
  for (const extension of DEFAULT_EXTENSIONS) {
    const pathWithExt = entryPath + extension
    if (await fsExists(path.resolve(cwd, pathWithExt))) return pathWithExt
  }

  return null
}

export async function resolveEntry(
  logger: Logger,
  entry: UserConfig['entry'],
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
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(entry)) {
      const inferred = await inferEntryExtension(value, cwd)
      if (inferred) {
        result[key] = path.resolve(cwd, inferred)
      } else {
        result[key] = path.resolve(cwd, value)
      }
    }
    return result
  }

  const entriesWithInferredExt = await Promise.all(
    entry.map(async (entryPath) => {
      if (isGlobPattern(entryPath)) return entryPath

      const inferred = await inferEntryExtension(entryPath, cwd)
      return inferred || entryPath
    }),
  )

  const resolvedEntry = (
    await glob(entriesWithInferredExt, { cwd, expandDirectories: false })
  ).map((file) => path.resolve(cwd, file))
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
