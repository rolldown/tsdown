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
            const files = await glob(patterns, {
              cwd,
              expandDirectories: false,
            })
            if (!files.length) {
              throw new Error(
                `Cannot find files for entry key "${key}" with patterns: ${JSON.stringify(
                  patterns,
                )}`,
              )
            }

            let valueGlobBase: string | undefined
            for (const pattern of patterns) {
              if (pattern.startsWith('!')) continue
              const base = picomatch.scan(pattern).base
              if (valueGlobBase === undefined) {
                valueGlobBase = base
              } else if (valueGlobBase !== base) {
                throw new Error(
                  `When using object entry with glob pattern key "${key}", all value glob patterns must have the same base directory.`,
                )
              }
            }
            if (valueGlobBase === undefined) {
              throw new Error(
                `Cannot determine base directory for value glob patterns of key "${key}".`,
              )
            }

            return files.map((file) => [
              slash(
                key.replaceAll(
                  '*',
                  stripExtname(path.relative(valueGlobBase, file)),
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
