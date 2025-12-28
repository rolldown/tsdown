import { watch as fsWatch, type FSWatcher } from 'node:fs'
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
  type DebugOptions,
  type InlineConfig,
  type ResolvedConfig,
} from './config/index.ts'
import { warnLegacyCJS } from './features/cjs.ts'
import { cleanChunks, cleanOutDir } from './features/clean.ts'
import { copy } from './features/copy.ts'
import {
  buildCssEntries,
  prepareCssEntries,
  writeCssEntries,
} from './features/css-bundle.ts'
import { separateCssEntries } from './features/entry.ts'
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
import { importWithError } from './utils/general.ts'
import { globalLogger } from './utils/logger.ts'

const asyncDispose: typeof Symbol.asyncDispose =
  Symbol.asyncDispose || Symbol.for('Symbol.asyncDispose')

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
    (config) => config.debug && config.debug.devtools,
  )

  const hasWatchConfig = configs.some((config) => config.watch)
  if (hasWatchConfig) {
    // Watch mode with shortcuts
    disposeCbs.push(shortcuts(restart))
    for (const bundle of bundles) {
      disposeCbs.push(bundle[asyncDispose])
    }
  } else if (firstDevtoolsConfig) {
    // build done, start devtools
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

  // Separate CSS entries from JS entries
  // CSS entries are processed by LightningCSS to avoid empty JS file generation
  const { jsEntry, cssEntry } = separateCssEntries(config.entry)
  const hasCssEntries = Object.keys(cssEntry).length > 0
  const hasJsEntries = Object.keys(jsEntry).length > 0

  // Create a modified config with only JS entries for Rolldown
  const jsConfig: ResolvedConfig = hasJsEntries
    ? { ...config, entry: jsEntry }
    : config

  // output rolldown config for debugging
  const debugRolldownConfigDir = await getDebugRolldownDir()

  const chunks: RolldownChunk[] = []
  let watcher: RolldownWatcher | undefined
  const cssWatchers: FSWatcher[] = []
  let ab: AbortController | undefined

  let updated = false
  const bundle: TsdownBundle = {
    chunks,
    config,
    async [asyncDispose]() {
      ab?.abort()
      await watcher?.close()
      // Close CSS file watchers
      for (const cssWatcher of cssWatchers) {
        cssWatcher.close()
      }
    },
  }

  // Prepare CSS entries first (without writing to disk)
  // This allows ReportPlugin to include CSS in its report
  let preparedCssEntries: Awaited<ReturnType<typeof prepareCssEntries>> = []
  if (hasCssEntries && !watch) {
    preparedCssEntries = await prepareCssEntries(config, cssEntry)
    // Add CSS chunks to the array so ReportPlugin can see them
    for (const { name, code, outputName } of preparedCssEntries) {
      chunks.push({
        type: 'asset',
        fileName: outputName,
        name,
        source: code,
      } as unknown as RolldownChunk)
    }
  }

  // Build JS entries with Rolldown (if any)
  // This may generate CSS files from Vue components, etc.
  if (hasJsEntries) {
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
  }

  // Write CSS entries after Rolldown build (to merge with Vue component styles, etc.)
  if (hasCssEntries && !watch && preparedCssEntries.length > 0) {
    // Find CSS chunks from Rolldown build (e.g., from Vue components)
    // These have 'outDir' property added by addOutDirToChunks
    const rolldownCssChunks = chunks.filter(
      (chunk): chunk is RolldownChunk & { outDir: string } =>
        chunk.type === 'asset' &&
        /\.css$/i.test(chunk.fileName) &&
        'outDir' in chunk,
    )

    const cssResult = await writeCssEntries(
      config,
      preparedCssEntries,
      rolldownCssChunks,
    )

    // Update chunks: remove old CSS chunks and add merged ones
    for (const cssChunk of cssResult.chunks) {
      // Remove all CSS chunks with the same fileName (both prepared and Rolldown-generated)
      let index: number
      while (
        (index = chunks.findIndex(
          (chunk) =>
            chunk.type === 'asset' && chunk.fileName === cssChunk.fileName,
        )) !== -1
      ) {
        chunks.splice(index, 1)
      }

      chunks.push(cssChunk)
    }
  }

  // Setup CSS file watchers in watch mode
  if (hasCssEntries && watch) {
    setupCssWatchers()
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

          // Build CSS entries after Rolldown completes (to merge with Vue component styles, etc.)
          if (hasCssEntries) {
            // Find existing CSS chunks from Rolldown build
            const existingCssChunks = chunks.filter(
              (chunk) =>
                chunk.type === 'asset' && /\.css$/i.test(chunk.fileName),
            )

            const cssResult = await buildCssEntries(
              config,
              cssEntry,
              existingCssChunks,
            )

            // Remove existing CSS chunks that were merged
            for (const cssChunk of cssResult.chunks) {
              const existingIndex = chunks.findIndex(
                (chunk) =>
                  chunk.type === 'asset' &&
                  chunk.fileName === cssChunk.fileName,
              )
              if (existingIndex !== -1) {
                chunks.splice(existingIndex, 1)
              }
            }

            chunks.push(...cssResult.chunks)
          }

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

  function setupCssWatchers() {
    // Track debounce timers for each CSS file
    const rebuildTimers = new Map<string, NodeJS.Timeout>()

    for (const [name, file] of Object.entries(cssEntry)) {
      const absolutePath = path.isAbsolute(file)
        ? file
        : path.resolve(config.cwd, file)

      const watcher = fsWatch(absolutePath, (eventType) => {
        if (eventType !== 'change') return

        // Clear existing timer for this file
        const existingTimer = rebuildTimers.get(absolutePath)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        // Debounce: wait 100ms before rebuilding
        const timer = setTimeout(async () => {
          rebuildTimers.delete(absolutePath)

          console.info('')
          logger.info(
            `Found ${bold(path.relative(config.cwd, absolutePath))} changed, rebuilding CSS...`,
          )

          const startTime = performance.now()
          try {
            // Rebuild only the changed CSS file
            const singleCssEntry = { [name]: file }
            const cssResult = await buildCssEntries(config, singleCssEntry)

            // Update chunks: remove old CSS chunk and add new one
            const cssFileName = `${name}.css`
            const oldChunkIndex = chunks.findIndex(
              (chunk) =>
                chunk.type === 'asset' && chunk.fileName === cssFileName,
            )
            if (oldChunkIndex !== -1) {
              chunks.splice(oldChunkIndex, 1)
            }
            chunks.push(...cssResult.chunks)

            logger.success(
              config.nameLabel,
              `CSS rebuilt in ${green(`${Math.round(performance.now() - startTime)}ms`)}`,
            )
          } catch (error) {
            logger.error(error)
          }
        }, 100)

        rebuildTimers.set(absolutePath, timer)
      })

      watcher.on('error', (error) => {
        logger.error(
          `CSS watcher error for ${path.relative(config.cwd, absolutePath)}: ${error}`,
        )
      })

      cssWatchers.push(watcher)
    }
  }

  async function initBuildOptions() {
    // Use jsConfig (with CSS entries removed) for Rolldown
    const buildOptions = await getBuildOptions(
      jsConfig,
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
        jsConfig.name,
        format,
        buildOptions,
      )
    }

    const configs: BuildOptions[] = [buildOptions]
    if (format === 'cjs' && dts) {
      configs.push(
        await getBuildOptions(
          jsConfig,
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

export { defineConfig } from './config.ts'
export * from './config/types.ts'
export { globalLogger, type Logger } from './utils/logger.ts'
export * as Rolldown from 'rolldown'
