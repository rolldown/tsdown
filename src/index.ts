import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bold, green } from 'ansis'
import { clearRequireCache } from 'import-without-cache'
import {
  build as rolldownBuild,
  watch as rolldownWatch,
  type BuildOptions,
  type RolldownWatcher,
} from 'rolldown'
import {
  resolveConfig,
  type InlineConfig,
  type ResolvedConfig,
} from './config/index.ts'
import { warnLegacyCJS } from './features/cjs.ts'
import { cleanChunks, cleanOutDir } from './features/clean.ts'
import { copy } from './features/copy.ts'
import { startDevtoolsUI } from './features/devtools.ts'
import { createHooks, executeOnSuccess } from './features/hooks.ts'
import { bundleDone, initBundleByPkg } from './features/pkg/index.ts'
import {
  debugBuildOptions,
  getBuildOptions,
  getDebugRolldownDir,
} from './features/rolldown.ts'
import { shortcuts } from './features/shortcuts.ts'
import { endsWithConfig } from './features/watch.ts'
import {
  addOutDirToChunks,
  type RolldownChunk,
  type TsdownBundle,
} from './utils/chunks.ts'
import { typeAssert } from './utils/general.ts'
import { globalLogger } from './utils/logger.ts'

const asyncDispose: typeof Symbol.asyncDispose =
  Symbol.asyncDispose || Symbol.for('Symbol.asyncDispose')

/**
 * Build with tsdown.
 */
export async function build(
  userOptions: InlineConfig = {},
): Promise<TsdownBundle[]> {
  globalLogger.level = userOptions.logLevel || 'info'
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
    clearRequireCache()
    build(userOptions)
  }

  const configChunksByPkg = initBundleByPkg(configs)

  function done(bundle: TsdownBundle) {
    return bundleDone(configChunksByPkg, bundle)
  }

  globalLogger.info('Build start')
  const bundles = await Promise.all(
    configs.map((options) => {
      const isDualFormat = options.pkg
        ? configChunksByPkg[options.pkg.packageJsonPath].formats.size > 1
        : true
      return buildSingle(
        options,
        configFiles,
        isDualFormat,
        clean,
        restart,
        done,
      )
    }),
  )

  const firstDevtoolsConfig = configs.find(
    (config) => config.devtools && config.devtools.ui,
  )

  const hasWatchConfig = configs.some((config) => config.watch)
  if (hasWatchConfig) {
    // Watch mode with shortcuts
    disposeCbs.push(shortcuts(restart))
    for (const bundle of bundles) {
      disposeCbs.push(bundle[asyncDispose])
    }
  } else if (firstDevtoolsConfig) {
    typeAssert(firstDevtoolsConfig.devtools)
    // build done, start devtools
    startDevtoolsUI(firstDevtoolsConfig.devtools)
  }

  return bundles
}

/**
 * Build a single configuration, without watch and shortcuts features.
 *
 * Internal API, not for public use
 *
 * @internal
 * @param config Resolved options
 */
export async function buildSingle(
  config: ResolvedConfig,
  configFiles: string[],
  isDualFormat: boolean,
  clean: () => Promise<void>,
  restart: () => void,
  done: (bundle: TsdownBundle) => Promise<void>,
): Promise<TsdownBundle> {
  const { format, dts, watch, logger, outDir } = config
  const { hooks, context } = await createHooks(config)

  warnLegacyCJS(config)

  const startTime = performance.now()
  await hooks.callHook('build:prepare', context)

  await clean()

  // output rolldown config for debugging
  const debugRolldownConfigDir = await getDebugRolldownDir()

  const chunks: RolldownChunk[] = []
  let watcher: RolldownWatcher | undefined
  let ab: AbortController | undefined

  let updated = false
  const bundle: TsdownBundle = {
    chunks,
    config,
    async [asyncDispose]() {
      ab?.abort()
      await watcher?.close()
    },
  }

  const configs = await initBuildOptions()
  if (watch) {
    watcher = rolldownWatch(configs)
    handleWatcher(watcher)
  } else {
    const outputs = await rolldownBuild(configs)
    for (const { output } of outputs) {
      chunks.push(...addOutDirToChunks(output, outDir))
    }
  }

  if (!watch) {
    logger.success(
      config.nameLabel,
      `Build complete in ${green(`${Math.round(performance.now() - startTime)}ms`)}`,
    )
    await postBuild()
  }

  return bundle

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
          if (config.clean.length) {
            await cleanChunks(config.outDir, chunks)
          }

          chunks.length = 0
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
            if (logger.level === 'info') {
              console.info('')
            }
            logger.info(
              `Found ${bold(changedFile.join(', '))} changed, rebuilding...`,
            )
          }
          changedFile.length = 0
          break
        }

        case 'BUNDLE_END': {
          await event.result.close()
          logger.success(config.nameLabel, `Rebuilt in ${event.duration}ms.`)
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

  async function initBuildOptions() {
    const buildOptions = await getBuildOptions(
      config,
      format,
      configFiles,
      bundle,
      false,
      isDualFormat,
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

    const configs: BuildOptions[] = [buildOptions]
    if (format === 'cjs' && dts) {
      configs.push(
        await getBuildOptions(
          config,
          format,
          configFiles,
          bundle,
          true,
          isDualFormat,
        ),
      )
    }

    return configs
  }

  async function postBuild() {
    await copy(config)
    if (!updated) {
      await done(bundle)
    }

    await hooks.callHook('build:done', { ...context, chunks })
    updated = true

    ab?.abort()
    ab = executeOnSuccess(config)
  }
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot: string = path.resolve(dirname, '..')

/** @internal */
export const shimFile: string = path.resolve(pkgRoot, 'esm-shims.js')

export { defineConfig, mergeConfig } from './config.ts'
export * from './config/types.ts'
export { globalLogger, type Logger } from './utils/logger.ts'
export * as Rolldown from 'rolldown'
