import path from 'node:path'
import { clearRequireCache } from 'import-without-cache'
import { build as rolldownBuild, type BuildOptions } from 'rolldown'
import {
  resolveConfig,
  type InlineConfig,
  type ResolvedConfig,
} from './config/index.ts'
import { warnLegacyCJS } from './features/cjs.ts'
import { finishOutput, markBuilding } from './features/clean.ts'
import { copy, resolveCopyEntries } from './features/copy.ts'
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
import { endsWithConfig, watchForRebuild } from './features/watch.ts'
import {
  addOutDirToChunks,
  type RolldownChunk,
  type TsdownBundle,
  type TsdownHandle,
} from './utils/chunks.ts'
import { debounce, resolveComma, toArray, typeAssert } from './utils/general.ts'
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
  // Every format is in flight until it settles, so a clean waits for the
  // others that share its outDir instead of deleting their files.
  for (const config of configs) markBuilding(config)

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
      const isDualFormat =
        !options.pkg ||
        configChunksByPkg[options.pkg.packageJsonPath].formats.size > 1
      return buildSingle(
        options,
        configDeps,
        isDualFormat,
        () => {
          if (restarted) return
          restart().catch((error) => globalLogger.error(error))
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

  return {
    bundles,
    watch: { restart, close },
  }
}

/**
 * Build a single configuration, without watch and shortcuts features.
 * @param config Resolved options
 */
async function buildSingle(
  config: ResolvedConfig,
  configDeps: Set<string>,
  isDualFormat: boolean,
  restart: () => void,
  done: (bundle: TsdownBundle) => Promise<void>,
): Promise<TsdownBundle> {
  const { format, dts, watch, logger, outDir } = config
  const { hooks, context } = await createHooks(config)

  warnLegacyCJS(config)

  await hooks.callHook('build:prepare', context)

  // output rolldown config for debugging
  const debugRolldownConfigDir = await getDebugRolldownDir()

  const chunks: RolldownChunk[] = []
  let ab: AbortController | undefined
  let stopWatching: (() => void) | undefined

  let hasBuilt = false
  const bundle: TsdownBundle = {
    chunks,
    config,
    inlinedDeps: new Map(),
    async [Symbol.asyncDispose]() {
      ab?.abort()
      await Promise.resolve(stopWatching?.())
    },
  }

  const configs = await initBuildOptions()

  async function emit(): Promise<void> {
    const emitStartedAt = performance.now()
    chunks.length = 0
    markBuilding(config)
    try {
      const outputs = await config.runBuild(() => rolldownBuild(configs))
      chunks.length = 0
      for (const { output } of outputs) {
        chunks.push(...addOutDirToChunks(output, outDir))
      }
      logger.success(
        config.nameLabel,
        `Build complete in ${styleText.green(`${Math.round(performance.now() - emitStartedAt)}ms`)}`,
      )
      await postBuild()
    } catch (error) {
      await finishOutput(config)
      throw error
    }
  }

  await emit()
  if (watch) {
    let rebuildQueue: Promise<void> = Promise.resolve()
    const rebuild = debounce((file: string, event: string) => {
      rebuildQueue = rebuildQueue
        .then(() => onFileChange(file, event))
        .catch((error: unknown) => logger.error(error))
    }, 100)
    const extraWatch = new Set<string>(configDeps)
    if (typeof config.tsconfig === 'string') extraWatch.add(config.tsconfig)
    if (config.pkg) extraWatch.add(config.pkg.packageJsonPath)
    if (typeof config.watch !== 'boolean') {
      for (const file of resolveComma(toArray(config.watch))) {
        extraWatch.add(path.resolve(config.cwd, file))
      }
    }
    if (config.copy) {
      for (const entry of await resolveCopyEntries(config)) {
        extraWatch.add(entry.from)
      }
    }
    const fsWatcher = watchForRebuild(config, extraWatch, (file, event) => {
      rebuild(file, event)
    })
    stopWatching = () => {
      rebuild.cancel()
      fsWatcher.close()
    }
  }

  return bundle

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

  async function onFileChange(file: string, event: string): Promise<void> {
    if (configDeps.has(file) || endsWithConfig.test(file)) {
      globalLogger.info(`Reload config: ${file}, restarting...`)
      restart()
      return
    }
    if (event === 'rename' && config.rawEntry && isGlobEntry(config.rawEntry)) {
      const [newEntry] = await toObjectEntry(config.rawEntry, config.cwd)
      const currentKeys = Object.keys(config.entry).toSorted().join('\0')
      const newKeys = Object.keys(newEntry).toSorted().join('\0')
      if (currentKeys !== newKeys) {
        globalLogger.info('Entry files changed, restarting...')
        restart()
        return
      }
    }
    logger.clearScreen('info')
    logger.info(`Found ${styleText.bold(file)} changed, rebuilding...`)
    await emit()
  }

  async function postBuild() {
    // Snapshot before the first await. The next `emit` clears `chunks`, so
    // `exe` and hooks still see this build's output.
    const emitted = chunks.slice()
    await finishOutput(config, emitted)
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
