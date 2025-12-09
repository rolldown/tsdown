import path from 'node:path'
import { glob, isDynamicPattern } from 'tinyglobby'
import { fsCopy } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import { prettyName } from '../utils/logger.ts'
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

  const resolveCopyEntry = (dir: string | CopyEntry) => {
    const onlyHasFrom = typeof dir === 'string'
    const from = path.resolve(options.cwd, onlyHasFrom ? dir : dir.from)

    const relativeTo = path.relative(options.cwd, from).split(path.sep).slice(1).join(path.sep)
    const baseTo = onlyHasFrom ? options.outDir : path.resolve(options.cwd, dir.to)
    const to = path.resolve(baseTo, relativeTo)

    return { from, to }
  }

  const resolved = (await Promise.all(toArray(copy).map(async (dir) => {
    const onlyHasFrom = typeof dir === 'string'
    const from = onlyHasFrom ? dir : dir.from

    if (isDynamicPattern(from)) {
      const matchedFiles = await glob(from, {
        cwd: options.cwd,
        expandDirectories: false,
      })
      return matchedFiles.map((file) => resolveCopyEntry(
        onlyHasFrom ? file : { from: file, to: dir.to },
      ))
    }

    return resolveCopyEntry(dir)
  }))).flat()

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
