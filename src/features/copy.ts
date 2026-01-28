import path from 'node:path'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsCopy } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { Arrayable, Awaitable } from '../utils/types.ts'

export interface CopyEntry {
  /**
   * Source path or glob pattern.
   */
  from: string | string[]
  /**
   * Destination path.
   * If not specified, defaults to the output directory ("outDir").
   */
  to?: string
  /**
   * Whether to flatten the copied files (not preserving directory structure).
   *
   * @default true
   */
  flatten?: boolean
  /**
   * Output copied items to console.
   * @default false
   */
  verbose?: boolean
  /**
   * Change destination file or folder name.
   */
  rename?:
    | string
    | ((name: string, extension: string, fullPath: string) => string)
}
export type CopyOptions = Arrayable<string | CopyEntry>
export type CopyOptionsFn = (options: ResolvedConfig) => Awaitable<CopyOptions>

type ResolvedCopyEntry = CopyEntry & { from: string; to: string }

export async function resolveCopyEntries(
  options: ResolvedConfig,
): Promise<ResolvedCopyEntry[]> {
  if (!options.copy) return []

  const copy: CopyOptions =
    typeof options.copy === 'function'
      ? await options.copy(options)
      : options.copy

  const resolved = (
    await Promise.all(
      toArray(copy).map(async (entry) => {
        if (typeof entry === 'string') {
          entry = { from: [entry] }
        }
        let from = toArray(entry.from)

        const isGlob = from.some((f) => isDynamicPattern(f))
        if (isGlob) {
          from = await glob(from, {
            cwd: options.cwd,
            onlyFiles: true,
            expandDirectories: false,
          })
        }

        return from.map((file) =>
          resolveCopyEntry(
            { ...entry, from: file },
            options.cwd,
            options.outDir,
          ),
        )
      }),
    )
  ).flat()

  return resolved
}

export async function copy(options: ResolvedConfig): Promise<void> {
  if (!options.copy) return

  const resolved = await resolveCopyEntries(options)

  if (!resolved.length) {
    options.logger.warn(options.nameLabel, `No files matched for copying.`)
    return
  }

  await Promise.all(
    resolved.map(({ from, to, verbose }) => {
      if (verbose) {
        options.logger.info(
          options.nameLabel,
          `Copying files from ${path.relative(options.cwd, from)} to ${path.relative(
            options.cwd,
            to,
          )}`,
        )
      }
      return fsCopy(from, to)
    }),
  )
}

// https://github.com/vladshcherbin/rollup-plugin-copy/blob/master/src/index.js
// MIT License
function resolveCopyEntry(
  entry: CopyEntry & { from: string },
  cwd: string,
  outDir: string,
): CopyEntry & { from: string; to: string } {
  const { flatten = true, rename } = entry
  const from = path.resolve(cwd, entry.from)
  const to = entry.to ? path.resolve(cwd, entry.to) : outDir

  const { base, dir } = path.parse(path.relative(cwd, from))
  const destFolder =
    flatten || (!flatten && !dir) ? to : dir.replace(dir.split(path.sep)[0], to)
  const dest = path.join(
    destFolder,
    rename ? renameTarget(base, rename, from) : base,
  )

  return { ...entry, from, to: dest }
}

function renameTarget(
  target: string,
  rename: NonNullable<CopyEntry['rename']>,
  src: string,
) {
  const parsedPath = path.parse(target)

  return typeof rename === 'string'
    ? rename
    : rename(parsedPath.name, parsedPath.ext.replace('.', ''), src)
}
