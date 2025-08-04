import { blue } from 'ansis'
import {
  globalContext,
  invalidateContextFile,
} from 'rolldown-plugin-dts/tsc-context'
import { debounce, toArray } from '../utils/general'
import type { ResolvedOptions } from '../options'
import type { FSWatcher } from 'chokidar'

const endsWithConfig = /[\\/](?:package\.json|tsdown\.config.*)$/

export async function watchBuild(
  options: ResolvedOptions,
  configFiles: string[],
  rebuild: () => void,
  restart: () => void,
): Promise<FSWatcher> {
  if (typeof options.watch === 'boolean' && options.outDir === options.cwd) {
    throw new Error(
      `Watch is enabled, but output directory is the same as the current working directory.` +
        `Please specify a different watch directory using ${blue`watch`} option,` +
        `or set ${blue`outDir`} to a different directory.`,
    )
  }

  const files = toArray(
    typeof options.watch === 'boolean' ? options.cwd : options.watch,
  )
  options.logger.info(`Watching for changes in ${files.join(', ')}`)
  files.push(...configFiles)

  const { watch } = await import('chokidar')
  const debouncedRebuild = debounce(rebuild, 100)

  const watcher = watch(files, {
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ignored: [
      /[\\/]\.git[\\/]/,
      /[\\/]node_modules[\\/]/,
      options.outDir,
      ...options.ignoreWatch,
    ],
  })

  watcher.on('all', (type: string, file: string) => {
    if (configFiles.includes(file) || endsWithConfig.test(file)) {
      options.logger.info(`Reload config: ${file}`)
      restart()
      return
    }

    options.logger.info(`Change detected: ${type} ${file}`)
    invalidateContextFile(globalContext, file)
    debouncedRebuild()
  })

  return watcher
}
