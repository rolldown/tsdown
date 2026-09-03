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
import { isGlobEntry, toObjectEntry } from './features/entry.ts'
import { buildExe } from './features/exe.ts'
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
  type TsdownHandle,
} from './utils/chunks.ts'
import { debounce, typeAssert } from './utils/general.ts'
import { globalLogger } from './utils/logger.ts'
import { styleText } from './utils/style.ts'

/**
 * Build with tsdown.
 */
export async function build(
  inlineConfig: InlineConfig = {},
): Promise<TsdownHandle> {
  globalLogger.level = inlineConfig.logLevel || 'info'

  let isConfigResolved = false
  const { configs, deps } = await resolveConfig(inlineConfig, {
    restart,
    close,
  })
  const handlePromise = buildWithConfigs(configs, deps, () =>
    build(inlineConfig),
  )
  isConfigResolved = true
  return await handlePromise

  async function restart() {
    if (!isConfigResolved) {
      throw new Error(
        '`watch.restart` cannot be called before config resolution is complete.',
      )
    }
    return (await handlePromise).watch.restart()
  }

  async function close() {
    if (!isConfigResolved) {
      throw new Error(
        '`watch.close` cannot be called before config resolution is complete.',
      )
    }
    return (await handlePromise).watch.close()
  }
}

/**
 * Build with `ResolvedConfigs`.
 *
 * **Internal API, not for public use**
 * @private
 */
export async function buildWithConfigs(
  configs: ResolvedConfig[],
  configDeps: Set<string>,
  rebuild: () => Promise<TsdownHandle>,
): Promise<TsdownHandle> {
  const hasWatchConfig = configs.some((config) => config.watch)
  let cleanPromise: Promise<void> | undefined
  const clean = () => {
    if (cleanPromise) return cleanPromise
    return (cleanPromise = cleanOutDir(configs))
  }

  const disposeCbs: Array<() => void | PromiseLike<void>> = []
  let restarted = false

  function assertWatchMode() {
    if (!hasWatchConfig) {
      throw new Error('`watch` is only available in watch mode.')
    }
  }
  async function close() {
    assertWatchMode()
    await Promise.all(disposeCbs.map((cb) => cb()))
  }

  async function restart() {
    assertWatchMode()
    if (restarted) {
      throw new Error('`watch.restart` can only be called once per handle.')
    }
    restarted = true
    await close()
    clearRequireCache()
    return rebuild()
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
        configDeps,
        isDualFormat,
        clean,
        () => {
          if (!restarted) restart()
        },
        done,
      )
    }),
  )

  const firstDevtoolsConfig = configs.find(
    (config) => config.devtools && config.devtools.ui,
  )

  if (hasWatchConfig) {
    // Watch mode with shortcuts
    disposeCbs.push(shortcuts(restart))
    for (const bundle of bundles) {
      disposeCbs.push(bundle[Symbol.asyncDispose])
    }
  } else if (firstDevtoolsConfig) {
    typeAssert(firstDevtoolsConfig.devtools)
    // build done, start devtools
    startDevtoolsUI(firstDevtoolsConfig.devtools)
  }

  return { bundles, watch: { restart, close } }
}

/**
 * Build a single configuration, without watch and shortcuts features.
 * @param config Resolved options
 */
async function buildSingle(
  config: ResolvedConfig,
  configDeps: Set<string>,
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
  const debouncedPostBuild = debounce(() => {
    postBuild().catch((error) => logger.error(error))
  }, 100)

  let hasBuilt = false
  const bundle: TsdownBundle = {
    chunks,
    config,
    inlinedDeps: new Map(),
    async [Symbol.asyncDispose]() {
      debouncedPostBuild.cancel()
      ab?.abort()
      await watcher?.close()
    },
  }

  const configs = await initBuildOptions()
  if (watch) {
    watcher = rolldownWatch(configs)
    await handleWatcher(watcher)
  } else {
    const outputs = await config.runBuild(() => rolldownBuild(configs))
    for (const { output } of outputs) {
      chunks.push(...addOutDirToChunks(output, outDir))
    }
  }

  if (!watch) {
    logger.success(
      config.nameLabel,
      `Build complete in ${styleText.green(`${Math.round(performance.now() - startTime)}ms`)}`,
    )
    await postBuild()
  }

  return bundle

  function handleWatcher(watcher: RolldownWatcher) {
    const ready = Promise.withResolvers<void>()
    const changedFile: string[] = []
    let hasError = false

    watcher.on('change', async (id, event) => {
      if (event.event === 'update') {
        changedFile.push(id)
        // Cancel pending postBuild immediately on file change,
        // before the new build cycle starts. This prevents duplicate
        // onSuccess execution when rapid file changes (e.g. VS Code
        // auto-save) trigger multiple build cycles.
        debouncedPostBuild.cancel()
        ab?.abort()
      }
      if (configDeps.has(id) || endsWithConfig.test(id)) {
        globalLogger.info(`Reload config: ${id}, restarting...`)
        restart()
      }
      if (
        (event.event === 'create' || event.event === 'delete') &&
        config.rawEntry &&
        isGlobEntry(config.rawEntry)
      ) {
        const [newEntry] = await toObjectEntry(config.rawEntry, config.cwd)
        const currentKeys = Object.keys(config.entry).toSorted().join('\0')
        const newKeys = Object.keys(newEntry).toSorted().join('\0')
        if (currentKeys !== newKeys) {
          globalLogger.info('Entry files changed, restarting...')
          restart()
        }
      }
    })

    watcher.on('event', async (event) => {
      switch (event.code) {
        case 'START': {
          debouncedPostBuild.cancel()

          if (config.clean.length) {
            await cleanChunks(config.outDir, chunks)
          }

          chunks.length = 0
          hasError = false
          ready.resolve()
          break
        }

        case 'END': {
          if (!hasError) {
            debouncedPostBuild()
          }
          break
        }

        case 'BUNDLE_START': {
          if (changedFile.length) {
            logger.clearScreen('info')
            logger.info(
              `Found ${styleText.bold(changedFile.join(', '))} changed, rebuilding...`,
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

    return ready.promise
  }

  async function initBuildOptions() {
    const buildOptions = await getBuildOptions(
      config,
      format,
      configDeps,
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
          configDeps,
          bundle,
          true, // cjsDts
          isDualFormat,
        ),
      )
    }

    return configs
  }

  async function postBuild() {
    await copy(config)
    await buildExe(config, chunks)

    if (!hasBuilt) {
      await done(bundle)
    }

    await hooks.callHook('build:done', { ...context, chunks })
    hasBuilt = true

    ab?.abort()
    ab = executeOnSuccess(config)
  }
}
