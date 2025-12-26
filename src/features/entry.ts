import path from 'node:path'
import picomatch from 'picomatch'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsExists, lowestCommonAncestor, stripExtname } from '../utils/fs.ts'
import { slash, toArray } from '../utils/general.ts'
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
  entry: string | string[] | Record<string, string | string[]>,
  cwd: string,
): Promise<Record<string, string>> {
  if (typeof entry === 'string') {
    entry = [entry]
  }
  if (!Array.isArray(entry)) {
    // resolve object entry with globs
    return Object.fromEntries(
      (
        await Promise.all(
          Object.entries(entry).map(async ([key, value]) => {
            if (!key.includes('*')) {
              if (Array.isArray(value)) {
                throw new TypeError(
                  `Object entry "${key}" cannot have an array value when the key is not a glob pattern.`,
                )
              }

              return [[key, value]]
            }

            const patterns = toArray(value)

            const positivePatterns = patterns.filter((p) => !p.startsWith('!'))
            if (positivePatterns.length === 0) {
              throw new TypeError(
                `Object entry "${key}" has no positive pattern. At least one positive pattern is required.`,
              )
            }

            if (positivePatterns.length > 1) {
              throw new TypeError(
                `Object entry "${key}" has multiple positive patterns: ${positivePatterns.join(', ')}. ` +
                  `Only one positive pattern is allowed. Use negation patterns (prefixed with "!") to exclude files.`,
              )
            }

            const valueGlob = picomatch.scan(positivePatterns[0])
            const files = await glob(patterns, {
              cwd,
              expandDirectories: false,
            })

            return files.map((file) => [
              slash(
                key.replaceAll(
                  '*',
                  stripExtname(path.relative(valueGlob.base, file)),
                ),
              ),
              path.resolve(cwd, file),
            ])
          }),
        )
      ).flat(),
    )
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
      return [slash(stripExtname(relative)), file]
    }),
  )
}
