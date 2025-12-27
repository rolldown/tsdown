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
      // Keep .css extension for CSS files to avoid name conflicts with JS files
      // e.g., index.js -> "index", index.css -> "index.css"
      // CSS entries will be processed separately by LightningCSS
      const isCss = /\.css$/i.test(file)
      return [slash(isCss ? relative : stripExtname(relative)), file]
    }),
  )
}

export interface SeparatedEntries {
  /** Non-CSS entries to be processed by Rolldown */
  jsEntry: Record<string, string>
  /** CSS-only entries to be processed by LightningCSS */
  cssEntry: Record<string, string>
}

/**
 * Separate CSS entries from JS entries.
 * CSS entries will be processed by LightningCSS instead of Rolldown
 * to avoid generating empty JS files.
 */
export function separateCssEntries(
  entry: Record<string, string>,
): SeparatedEntries {
  const jsEntry: Record<string, string> = {}
  const cssEntry: Record<string, string> = {}

  for (const [name, file] of Object.entries(entry)) {
    if (/\.css$/i.test(file)) {
      // CSS entry name includes .css extension (e.g., "index.css")
      // We strip the .css from the name for the output file
      const outputName = name.replace(/\.css$/i, '')
      cssEntry[outputName] = file
    } else {
      jsEntry[name] = file
    }
  }

  return { jsEntry, cssEntry }
}
