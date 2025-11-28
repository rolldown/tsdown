import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bold, green } from 'ansis'
import {
  build as rolldownBuild,
  watch as rolldownWatch,
  type BuildOptions,
  type RolldownWatcher,
} from 'rolldown'
import { setNoCacheLoad } from './config/config.ts'
import {
  resolveConfig,
  type DebugOptions,
  type InlineConfig,
  type NormalizedFormat,
  type ResolvedConfig,
} from './config/index.ts'
import { attw } from './features/attw.ts'
import { warnLegacyCJS } from './features/cjs.ts'
import { cleanOutDir } from './features/clean.ts'
import { copy } from './features/copy.ts'
import { writeExports, type TsdownChunks } from './features/exports.ts'
import { createHooks, executeOnSuccess } from './features/hooks.ts'
import { publint } from './features/publint.ts'
import {
  debugBuildOptions,
  getBuildOptions,
  getDebugRolldownDir,
} from './features/rolldown.ts'
import { shortcuts } from './features/shortcuts.ts'
import { endsWithConfig, type WatchContext } from './features/watch.ts'
import { importWithError } from './utils/general.ts'
import { globalLogger, prettyName, type Logger } from './utils/logger.ts'

const asyncDispose: typeof Symbol.asyncDispose =
  Symbol.asyncDispose || Symbol.for('Symbol.asyncDispose')

export interface TsdownBundle extends AsyncDisposable {
  chunks: TsdownChunks
}

/**
 * Build with tsdown.
 */
export async function build(
  userOptions: InlineConfig = {},
): Promise<TsdownBundle[]> {
  globalLogger.level =
    userOptions.logLevel || (userOptions.silent ? 'error' : 'info')
  const { configs, files: configFiles } = await resolveConfig(userOptions)

  let cleanPromise: Promise<void> | undefined
  const clean = () => {
    if (cleanPromise) return cleanPromise
    return (cleanPromise = cleanOutDir(configs))
  }

  const disposeCbs: Array<() => void | PromiseLike<void>> = []
  let restarting = false
  async function restart() {
    if (restarting) return
    restarting = true

    await Promise.all(disposeCbs.map((cb) => cb()))

    setNoCacheLoad()
    build(userOptions)
  }

  globalLogger.info('Build start')
  const bundles = await Promise.all(
    configs.map((options) => buildSingle(options, configFiles, clean, restart)),
  )

  const firstDevtoolsConfig = configs.find(
    (config) => config.debug && config.debug.devtools,
  )

  const hasWatchConfig = configs.some((config) => config.watch)
  if (hasWatchConfig) {
    // Watch mode with shortcuts
    disposeCbs.push(shortcuts(restart))
    for (const bundle of bundles) {
      disposeCbs.push(bundle[asyncDispose])
    }

    return undefined as never
  }

  // build done
  if (firstDevtoolsConfig) {
    const { start } = await importWithError<
      typeof import('@vitejs/devtools/cli-commands')
    >('@vitejs/devtools/cli-commands')

    const devtoolsOptions = (firstDevtoolsConfig.debug as DebugOptions).devtools
    await start({
      host: '127.0.0.1',
      open: true,
      ...(typeof devtoolsOptions === 'object' ? devtoolsOptions : {}),
    })
  }

  return bundles
}

/**
 * Build a single configuration, without watch and shortcuts features.
 *
 * Internal API, not for public use
 *
 * @private
 * @param config Resolved options
 */
export async function buildSingle(
  config: ResolvedConfig,
  configFiles: string[],
  clean: () => Promise<void>,
  restart: () => void,
): Promise<TsdownBundle> {
  const { format: formats, dts, watch, logger } = config
  const { hooks, context } = await createHooks(config)

  warnLegacyCJS(config)

  const startTime = performance.now()
  await hooks.callHook('build:prepare', context)

  // TODO
  // if (first) {
  await clean()
  // } else {
  //   await cleanOutDir([config])
  // }

  // output rolldown config for debugging
  const debugRolldownConfigDir = await getDebugRolldownDir()

  const chunks: TsdownChunks = {}
  let watcher: RolldownWatcher | undefined
  const watchCtx: Omit<WatchContext, 'chunks'> = {
    config,
  }

  let ab: AbortController | undefined

  const isMultiFormat = formats.length > 1
  const configsByFormat = (
    await Promise.all(formats.map((format) => buildOptionsByFormat(format)))
  ).flat()
  if (watch) {
    watcher = rolldownWatch(configsByFormat.map((item) => item[1]))
    handleWatcher(watcher)
  } else {
    const outputs = await rolldownBuild(configsByFormat.map((item) => item[1]))
    for (const [i, output] of outputs.entries()) {
      const format = configsByFormat[i][0]
      chunks[format] ||= []
      chunks[format].push(...output.output)
    }
  }

  if (!watch) {
    logger.success(
      prettyName(config.name),
      `Build complete in ${green(`${Math.round(performance.now() - startTime)}ms`)}`,
    )
    await postBuild()
  }

  return {
    chunks,
    async [asyncDispose]() {
      ab?.abort()
      await watcher?.close()
    },
  }

  function handleWatcher(watcher: RolldownWatcher) {
    const changedFile: string[] = []
    let hasError = false

    watcher.on('change', (id, event) => {
      if (event.event === 'update') {
        changedFile.push(id)
      }
      if (configFiles.includes(id) || endsWithConfig.test(id)) {
        globalLogger.info(`Reload config: ${id}, restarting...`)
        restart()
      }
    })

    watcher.on('event', async (event) => {
      switch (event.code) {
        case 'START': {
          for (const format of formats) {
            chunks[format]!.length = 0
          }
          hasError = false
          break
        }

        case 'END': {
          if (!hasError) {
            await postBuild()
          }
          break
        }

        case 'BUNDLE_START': {
          if (changedFile.length > 0) {
            console.info('')
            logger.info(
              `Found ${bold(changedFile.join(', '))} changed, rebuilding...`,
            )
          }
          changedFile.length = 0
          break
        }

        case 'BUNDLE_END': {
          await event.result.close()
          logger.success(`Rebuilt in ${event.duration}ms.`)
          break
        }

        case 'ERROR': {
          await event.result.close()
          logger.error(event.error)
          hasError = true
          break
        }
      }
    })
  }

  async function buildOptionsByFormat(format: NormalizedFormat) {
    const watchContext = {
      ...watchCtx,
      chunks: (chunks[format] = []),
    }

    const buildOptions = await getBuildOptions(
      config,
      format,
      configFiles,
      watchContext,
      false,
      isMultiFormat,
    )
    await hooks.callHook('build:before', {
      ...context,
      buildOptions,
    })
    if (debugRolldownConfigDir) {
      await debugBuildOptions(
        debugRolldownConfigDir,
        config.name,
        format,
        buildOptions,
      )
    }

    const configs: [format: NormalizedFormat, config: BuildOptions][] = [
      [format, buildOptions],
    ]
    if (format === 'cjs' && dts) {
      configs.push([
        format,
        await getBuildOptions(
          config,
          format,
          configFiles,
          watchContext,
          true,
          isMultiFormat,
        ),
      ])
    }

    return configs
  }

  async function postBuild() {
    await Promise.all([writeExports(config, chunks), copy(config)])
    // TODO: perf use one tarball for both attw and publint
    await Promise.all([publint(config), attw(config)])
    await hooks.callHook('build:done', context)

    ab?.abort()
    ab = executeOnSuccess(config)
  }
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot: string = path.resolve(dirname, '..')

/** @internal */
export const shimFile: string = path.resolve(pkgRoot, 'esm-shims.js')

export { defineConfig } from './config.ts'
export * from './config/types.ts'
export { globalLogger, type Logger }
