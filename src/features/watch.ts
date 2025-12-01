import { addOutDirToChunks } from '../utils/chunks.ts'
import { resolveComma, toArray } from '../utils/general.ts'
import type { ResolvedConfig } from '../config/types.ts'
import type { OutputAsset, OutputChunk, Plugin } from 'rolldown'

export const endsWithConfig: RegExp =
  /[\\/](?:tsdown\.config.*|package\.json|tsconfig\.json)$/

export interface WatchContext {
  config: ResolvedConfig
  chunks: Array<OutputChunk | OutputAsset>
}

export function WatchPlugin(
  configFiles: string[],
  { config, chunks }: WatchContext,
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
    buildStart() {
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
    },
    generateBundle: {
      order: 'post',
      handler(outputOptions, bundle) {
        chunks.push(...addOutDirToChunks(Object.values(bundle), config.outDir))
      },
    },
  }
}
