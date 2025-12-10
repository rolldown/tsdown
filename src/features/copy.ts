import path from 'node:path'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsCopy, fsStat } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import { prettyName } from '../utils/logger.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { Arrayable, Awaitable } from '../utils/types.ts'

export interface CopyEntry {
  /**
   * Source path or glob pattern.
   */
  from: string
  /**
   * Destination path.
   * If not specified, defaults to the output directory ("outDir").
   */
  to?: string
  /**
   * Whether to flatten the copied files (not preserving directory structure).
   *
   * @default false
   */
  flatten?: boolean
}
export type CopyOptions = Arrayable<string | CopyEntry>
export type CopyOptionsFn = (options: ResolvedConfig) => Awaitable<CopyOptions>

export async function copy(options: ResolvedConfig): Promise<void> {
  if (!options.copy) return

  const copy: CopyOptions =
    typeof options.copy === 'function'
      ? await options.copy(options)
      : options.copy

  const resolveCopyEntry = async (entry: CopyEntry) => {
    const from = path.resolve(options.cwd, entry.from)
    const parsedFrom = path.parse(path.relative(options.cwd, from))
    const dest = entry.to ? path.resolve(options.cwd, entry.to) : options.outDir

    if (entry.flatten || !parsedFrom.dir) {
      const isFile = (await fsStat(from))?.isFile()
      const to = isFile ? path.join(dest, parsedFrom.base) : dest
      return { from, to }
    }

    const to = path.join(
      dest,
      // Stripe off the first segment to avoid unnecessary nesting
      // e.g. "src/index.css" -> index.css" -> "dist/index.css"
      parsedFrom.dir.replace(parsedFrom.dir.split(path.sep)[0], ''),
      parsedFrom.base,
    )

    return { from, to }
  }

  const resolved = (
    await Promise.all(
      toArray(copy).map(async (entry) => {
        const isNakedEntry = typeof entry === 'string'
        const from = isNakedEntry ? entry : entry.from

        if (isDynamicPattern(from)) {
          const files = await glob(from, {
            cwd: options.cwd,
            onlyFiles: true,
            expandDirectories: false,
          })
          return Promise.all(
            files.map((file) =>
              resolveCopyEntry(
                isNakedEntry
                  ? { from: file }
                  : { from: file, to: entry.to, flatten: entry.flatten },
              ),
            ),
          )
        }

        return resolveCopyEntry(isNakedEntry ? { from: entry } : entry)
      }),
    )
  ).flat()

  const name = prettyName(options.name)
  await Promise.all(
    resolved.map((dir) => {
      options.logger.info(
        name,
        `Copying files from ${path.relative(options.cwd, dir.from)} to ${path.relative(
          options.cwd,
          dir.to,
        )}`,
      )
      return fsCopy(dir.from, dir.to)
    }),
  )
}
