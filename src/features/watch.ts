import path from 'node:path'
import { blue } from 'ansis'
import { RE_NODE_MODULES } from 'rolldown-plugin-dts/filename'
import {
  globalContext,
  invalidateContextFile,
} from 'rolldown-plugin-dts/tsc-context'
import { debounce, toArray } from '../utils/general.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { FSWatcher } from 'chokidar'

const endsWithConfig =
  /[\\/](?:(?:package|tsconfig)\.json|pnpm-(?:workspace|lock)\.yaml|tsdown\.config.*)$/

export async function watchBuild(
  options: ResolvedConfig,
  configFiles: string[],
  rebuild: () => Promise<void>,
  restart: () => Promise<void>,
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
  const debouncedOnChange = debounce(onChange, 100)

  const watcher = watch(files, {
    cwd: options.cwd,
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ignored: [
      /[\\/]\.git[\\/]/,
      RE_NODE_MODULES,
      options.outDir,
      ...options.ignoreWatch,
    ],
  })

  let pending: string[] = []
  let pendingPromise: Promise<void> | undefined
  watcher.on('all', (type, file) => {
    pending.push(path.resolve(options.cwd, file))
    debouncedOnChange()
  })

  return watcher

  async function onChange() {
    await pendingPromise

    if (!pending.length) {
      return
    }

    for (const file of pending) {
      invalidateContextFile(globalContext, file)
    }

    const configRelated = pending.some(
      (file) => configFiles.includes(file) || endsWithConfig.test(file),
    )

    if (configRelated) {
      options.logger.info(`Restarting due to config change...`)
      pendingPromise = restart()
    } else {
      options.logger.info(`Change detected: ${pending.join(', ')}`)
      pendingPromise = rebuild()
    }
    pending = []
    await pendingPromise
  }
}
