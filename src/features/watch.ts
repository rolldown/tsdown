import { addOutDirToChunks } from '../utils/chunks.ts'
import { resolveComma, resolveFilePatterns, toArray } from '../utils/general.ts'
import type { TsdownBundle } from '../config/types.ts'
import type { CopyOptions } from './copy.ts'
import type { Plugin } from 'rolldown'

export const endsWithConfig: RegExp =
  /[\\/](?:tsdown\.config.*|package\.json|tsconfig\.json)$/

export function WatchPlugin(
  configFiles: string[],
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
      for (const file of configFiles) {
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
      if (config.copy) {
        const copyOptions: CopyOptions =
          typeof config.copy === 'function'
            ? await config.copy(config)
            : config.copy

        const copyFiles = (
          await Promise.all(
            toArray(copyOptions).map((entry) => {
              if (typeof entry === 'string') {
                return resolveFilePatterns(entry, config.cwd)
              }
              return resolveFilePatterns(entry.from, config.cwd)
            }),
          )
        ).flat()

        for (const file of copyFiles) {
          this.addWatchFile(file)
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
