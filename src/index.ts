import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { bold } from 'ansis'
import {
  build as rolldownBuild,
  watch as rolldownWatch,
  type BuildOptions,
  type OutputAsset,
  type OutputChunk,
  type OutputOptions,
  type RolldownPluginOption,
  type RolldownWatcher,
} from 'rolldown'
import { exec } from 'tinyexec'
import { attw } from './features/attw'
import { cleanOutDir } from './features/clean'
import { copy } from './features/copy'
import { writeExports, type TsdownChunks } from './features/exports'
import { ExternalPlugin } from './features/external'
import { createHooks } from './features/hooks'
import { LightningCSSPlugin } from './features/lightningcss'
import { NodeProtocolPlugin } from './features/node-protocol'
import { resolveChunkAddon, resolveChunkFilename } from './features/output'
import { publint } from './features/publint'
import { ReportPlugin } from './features/report'
import { getShimsInject } from './features/shims'
import { shortcuts } from './features/shortcuts'
import { RuntimeHelperCheckPlugin } from './features/target'
import { WatchPlugin } from './features/watch'
import {
  mergeUserOptions,
  resolveOptions,
  type NormalizedFormat,
  type Options,
  type ResolvedOptions,
} from './options'
import { ShebangPlugin } from './plugins'
import { lowestCommonAncestor } from './utils/fs'
import { logger, type Logger } from './utils/logger'
import type { Options as DtsOptions } from 'rolldown-plugin-dts'

/**
 * Build with tsdown.
 */
export async function build(userOptions: Options = {}): Promise<void> {
  if (typeof userOptions.silent === 'boolean') {
    logger.setSilent(userOptions.silent)
  }

  const { configs, files: configFiles } = await resolveOptions(userOptions)

  let cleanPromise: Promise<void> | undefined
  const clean = () => {
    if (cleanPromise) return cleanPromise
    return (cleanPromise = cleanOutDir(configs))
  }

  let restarting = false

  logger.info('Build start')
  const task = Promise.all(
    configs.map((options) => buildSingle(options, clean, configFiles, restart)),
  )
  if ((await task).some((d) => !!d)) {
    shortcuts(restart)
  }

  async function restart() {
    if (restarting) return

    restarting = true
    for (const dispose of await task) {
      await dispose?.[Symbol.asyncDispose]?.()
    }
    logger.info('Restarting build...\n')
    build(userOptions)
    restarting = false
  }
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot: string = path.resolve(dirname, '..')

/** @internal */
export const shimFile: string = path.resolve(pkgRoot, 'esm-shims.js')

/**
 * Build a single configuration, without watch and shortcuts features.
 *
 * Internal API, not for public use
 *
 * @private
 * @param config Resolved options
 */
export async function buildSingle(
  config: ResolvedOptions,
  clean: () => Promise<void>,
  configFiles: string[],
  restart: () => void,
): Promise<AsyncDisposable | undefined> {
  const { format: formats, dts, watch, onSuccess } = config
  let ab: AbortController | undefined

  const { hooks, context } = await createHooks(config)

  await hooks.callHook('build:prepare', context)
  ab?.abort()

  await clean()

  const isMultiFormat = formats.length > 1
  const chunks: TsdownChunks = {}
  const watchers: RolldownWatcher[] = []

  async function buildOptionsByFormat(format: NormalizedFormat) {
    const buildOptions = await getBuildOptions(
      config,
      format,
      configFiles,
      restart,
      (chunks[format] = []),
      isMultiFormat,
      false,
    )
    await hooks.callHook('build:before', {
      ...context,
      buildOptions,
    })

    const buildOptionsList: [
      format: NormalizedFormat,
      buildOptions: BuildOptions,
    ][] = [[format, buildOptions]]
    if (format === 'cjs' && dts) {
      buildOptionsList.push([
        format,
        await getBuildOptions(
          config,
          format,
          configFiles,
          restart,
          chunks[format],
          isMultiFormat,
          true,
        ),
      ])
    }

    return buildOptionsList
  }
  const buildOptionsList = (
    await Promise.all(formats.map(buildOptionsByFormat))
  ).flat()

  if (watch) {
    const watcher = rolldownWatch(buildOptionsList.map((item) => item[1]))
    const changedFile: string[] = []
    let hasError = false
    watcher.on('change', (id, event) => {
      if (event.event === 'update') {
        changedFile.push(id)
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
    watchers.push(watcher)
  } else {
    const outputs = (
      await rolldownBuild(buildOptionsList.map((item) => item[1]))
    ).map(({ output }) => output)
    for (const [i, output] of outputs.entries()) {
      const format = buildOptionsList[i][0]
      chunks[format] ||= []
      chunks[format].push(...output)
    }
  }

  if (watch) {
    return {
      async [Symbol.asyncDispose]() {
        ab?.abort()
        for (const watcher of watchers) {
          await watcher.close()
        }
      },
    }
  } else {
    await postBuild()
  }

  async function postBuild() {
    await Promise.all([writeExports(config, chunks), copy(config)])
    await Promise.all([publint(config), attw(config)])

    await hooks.callHook('build:done', context)

    ab = new AbortController()
    if (typeof onSuccess === 'string') {
      const p = exec(onSuccess, [], {
        nodeOptions: {
          shell: true,
          stdio: 'inherit',
          signal: ab.signal,
        },
      })
      p.then(({ exitCode }) => {
        if (exitCode) {
          process.exitCode = exitCode
        }
      })
    } else {
      await onSuccess?.(config, ab.signal)
    }
  }
}

async function getBuildOptions(
  config: ResolvedOptions,
  format: NormalizedFormat,
  configFiles: string[],
  restart: () => void,
  chunks: Array<OutputChunk | OutputAsset>,
  isMultiFormat?: boolean,
  cjsDts?: boolean,
): Promise<BuildOptions> {
  const {
    entry,
    external,
    plugins: userPlugins,
    outDir,
    platform,
    alias,
    treeshake,
    sourcemap,
    dts,
    minify,
    unused,
    target,
    define,
    shims,
    tsconfig,
    cwd,
    report,
    env,
    nodeProtocol,
    loader,
    name,
    unbundle,
    watch,
    banner,
    footer,
  } = config

  const plugins: RolldownPluginOption = []

  if (nodeProtocol) {
    plugins.push(NodeProtocolPlugin(nodeProtocol))
  }

  if (config.pkg || config.skipNodeModulesBundle) {
    plugins.push(ExternalPlugin(config))
  }

  if (dts) {
    const { dts: dtsPlugin } = await import('rolldown-plugin-dts')
    const options: DtsOptions = { tsconfig, ...dts }

    if (format === 'es') {
      plugins.push(dtsPlugin(options))
    } else if (cjsDts) {
      plugins.push(dtsPlugin({ ...options, emitDtsOnly: true }))
    }
  }
  if (!cjsDts) {
    if (unused) {
      const { Unused } = await import('unplugin-unused')
      plugins.push(Unused.rolldown(unused === true ? {} : unused))
    }
    if (target) {
      plugins.push(
        RuntimeHelperCheckPlugin(target),
        // Use Lightning CSS to handle CSS input. This is a temporary solution
        // until Rolldown supports CSS syntax lowering natively.
        await LightningCSSPlugin({ target }),
      )
    }
    plugins.push(ShebangPlugin(cwd, name, isMultiFormat))
  }

  if (report && !logger.silent) {
    plugins.push(ReportPlugin(report, cwd, cjsDts, name, isMultiFormat))
  }

  if (!cjsDts) {
    plugins.push(userPlugins)
  }

  if (watch) {
    plugins.push(WatchPlugin(chunks!, config, configFiles, restart))
  }

  cjsDts = !!cjsDts
  const inputOptions = await mergeUserOptions(
    {
      input: entry,
      cwd,
      external,
      resolve: {
        alias,
        tsconfigFilename: tsconfig || undefined,
      },
      treeshake,
      platform: cjsDts || format === 'cjs' ? 'node' : platform,
      define: {
        ...define,
        ...Object.keys(env).reduce((acc, key) => {
          const value = JSON.stringify(env[key])
          acc[`process.env.${key}`] = value
          acc[`import.meta.env.${key}`] = value
          return acc
        }, Object.create(null)),
      },
      transform: {
        target,
      },
      plugins,
      inject: {
        ...(shims && !cjsDts && getShimsInject(format, platform)),
      },
      moduleTypes: loader,
    },
    config.inputOptions,
    [format, { cjsDts }],
  )

  const [entryFileNames, chunkFileNames] = resolveChunkFilename(
    config,
    inputOptions,
    format,
  )
  const outputOptions: OutputOptions = await mergeUserOptions(
    {
      format: cjsDts ? 'es' : format,
      name: config.globalName,
      sourcemap,
      dir: outDir,
      minify: !cjsDts && minify,
      entryFileNames,
      chunkFileNames,
      preserveModules: unbundle,
      preserveModulesRoot: unbundle
        ? lowestCommonAncestor(...Object.values(entry))
        : undefined,
      banner: resolveChunkAddon(banner, format),
      footer: resolveChunkAddon(footer, format),
    },
    config.outputOptions,
    [format, { cjsDts }],
  )

  return {
    ...inputOptions,
    output: outputOptions,
  }
}

export { defineConfig } from './config'
export type {
  Options,
  ResolvedOptions,
  UserConfig,
  UserConfigFn,
} from './options'
export * from './options/types'
export { logger, type Logger }
