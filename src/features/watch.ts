import { resolveComma, toArray } from '../utils/general'
import { logger, prettyName } from '../utils/logger'
import type { ResolvedOptions } from '../options'
import type { OutputAsset, OutputChunk, Plugin } from 'rolldown'

const endsWithConfig = /[\\/]tsdown\.config.*$/

export function WatchPlugin(
  chunks: Array<OutputChunk | OutputAsset>,
  options: ResolvedOptions,
  configFiles: string[],
  restart: () => void,
): Plugin {
  return {
    name: 'tsdown:watch',
    options: options.ignoreWatch.length
      ? (inputOptions) => {
          inputOptions.watch ||= {}
          inputOptions.watch.exclude = toArray(inputOptions.watch.exclude)
          inputOptions.watch.exclude.push(...toArray(options.ignoreWatch))
        }
      : undefined,
    buildStart() {
      for (const file of configFiles) {
        this.addWatchFile(file)
      }
      if (typeof options.watch !== 'boolean') {
        for (const file of resolveComma(toArray(options.watch))) {
          this.addWatchFile(file)
        }
      }
    },
    watchChange(id) {
      if (configFiles.includes(id) || endsWithConfig.test(id)) {
        logger.info(prettyName(options.name), `Reload config: ${id}`)
        restart()
      }
    },
    generateBundle: {
      order: 'post',
      handler(outputOptions, bundle) {
        chunks.push(...Object.values(bundle))
      },
    },
  }
}
