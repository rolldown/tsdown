import { statSync, watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import { addOutDirToChunks } from '../utils/chunks.ts'
import { resolveComma, toArray } from '../utils/general.ts'
import { resolveCopyEntries } from './copy.ts'
import type { ResolvedConfig, TsdownBundle } from '../config/types.ts'
import type { Plugin } from 'rolldown'

function isInsideDir(dir: string, file: string): boolean {
  const relative = path.relative(dir, file)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

export const endsWithConfig: RegExp =
  /[\\/](?:tsdown\.config.*|package\.json|tsconfig\.json)$/

/**
 * Full rebuilds on source changes. Rolldown's incremental watch drops the
 * output directory when several builds share it, so `tsdown --watch` repeats
 * the normal build instead.
 */
export function watchForRebuild(
  config: ResolvedConfig,
  extraFiles: Iterable<string>,
  onChange: (file: string, event: string) => void,
): { close: () => void } {
  const ignoredDirs = [config.outDir, path.join(config.cwd, 'node_modules')]
  const watchers: FSWatcher[] = []

  const handle = (file: string, event: string) => {
    if (ignoredDirs.some((dir) => isInsideDir(dir, file))) return
    if (path.relative(config.cwd, file).split(path.sep).includes('.git')) return
    if (
      config.ignoreWatch.some((pattern) =>
        typeof pattern === 'string'
          ? file.includes(pattern)
          : pattern.test(file),
      )
    ) {
      return
    }
    onChange(file, event)
  }

  watchers.push(
    watch(config.cwd, { recursive: true }, (event, name) => {
      if (!name) return
      handle(path.resolve(config.cwd, name), event)
    }),
  )

  for (const extra of extraFiles) {
    if (isInsideDir(config.cwd, extra)) continue
    const isDirectory = statSync(extra).isDirectory()
    watchers.push(
      watch(extra, isDirectory ? { recursive: true } : {}, (event, name) => {
        const file = isDirectory && name ? path.resolve(extra, name) : extra
        handle(file, event)
      }),
    )
  }

  return {
    close() {
      for (const watcher of watchers) watcher.close()
    },
  }
}

export function WatchPlugin(
  configDeps: Set<string>,
  { config, chunks }: TsdownBundle,
): Plugin {
  return {
    name: 'tsdown:watch',
    options: config.ignoreWatch.length
      ? (inputOptions) => {
          inputOptions.watch ||= {}
          inputOptions.watch.exclude = toArray(inputOptions.watch.exclude)
          inputOptions.watch.exclude.push(...config.ignoreWatch)
        }
      : undefined,
    async buildStart() {
      config.tsconfig && this.addWatchFile(config.tsconfig)
      for (const file of configDeps) {
        this.addWatchFile(file)
      }
      if (typeof config.watch !== 'boolean') {
        for (const file of resolveComma(toArray(config.watch))) {
          this.addWatchFile(file)
        }
      }
      if (config.pkg) {
        this.addWatchFile(config.pkg.packageJsonPath)
      }

      // Watch copy source files
      // eslint-disable-next-line unicorn/prefer-early-return
      if (config.copy) {
        const resolvedEntries = await resolveCopyEntries(config)

        for (const entry of resolvedEntries) {
          this.addWatchFile(entry.from)
        }
      }
    },
    generateBundle: {
      order: 'post',
      handler(outputOptions, bundle) {
        chunks.push(...addOutDirToChunks(Object.values(bundle), config.outDir))
      },
    },
  }
}
