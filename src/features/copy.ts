import path from 'node:path'
import { fsCopy } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { Arrayable, Awaitable } from '../utils/types.ts'

export interface CopyEntry {
  from: string
  to: string
}
export type CopyOptions = Arrayable<string | CopyEntry>
export type CopyOptionsFn = (options: ResolvedConfig) => Awaitable<CopyOptions>

export async function copy(options: ResolvedConfig): Promise<void> {
  if (!options.copy) return

  const copy: CopyOptions =
    typeof options.copy === 'function'
      ? await options.copy(options)
      : options.copy

  const resolved: [from: string, to: string][] = toArray(copy).map((dir) => {
    const from = path.resolve(
      options.cwd,
      typeof dir === 'string' ? dir : dir.from,
    )
    const to =
      typeof dir === 'string'
        ? path.resolve(options.outDir, path.basename(from))
        : path.resolve(options.cwd, dir.to)
    return [from, to]
  })

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
}
