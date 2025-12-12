import path from 'node:path'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsCopy, fsStat } from '../utils/fs.ts'
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

        return Promise.all(
          from.map((file) => resolveCopyEntry({ ...entry, from: file })),
        )
      }),
    )
  ).flat()

  await Promise.all(
    resolved.map(([from, to]) => {
      options.logger.info(
        options.nameLabel,
        `Copying files from ${path.relative(options.cwd, from)} to ${path.relative(
          options.cwd,
          to,
        )}`,
      )
      return fsCopy(from, to)
    }),
  )

  async function resolveCopyEntry(
    entry: CopyEntry & { from: string },
  ): Promise<[from: string, to: string]> {
    const from = path.resolve(options.cwd, entry.from)
    const parsedFrom = path.parse(path.relative(options.cwd, from))
    const dest = entry.to ? path.resolve(options.cwd, entry.to) : options.outDir

    if (entry.flatten || !parsedFrom.dir) {
      const isFile = (await fsStat(from))?.isFile()
      const to = isFile ? path.join(dest, parsedFrom.base) : dest
      return [from, to]
    }

    const to = path.join(
      dest,
      // Stripe off the first segment to avoid unnecessary nesting
      // e.g. "src/index.css" -> index.css" -> "dist/index.css"
      parsedFrom.dir.replace(parsedFrom.dir.split(path.sep)[0], ''),
      parsedFrom.base,
    )

    return [from, to]
  }
}
