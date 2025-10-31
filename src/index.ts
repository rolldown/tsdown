import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { green } from 'ansis'
import { build as rolldownBuild } from 'rolldown'
import { exec } from 'tinyexec'
import treeKill from 'tree-kill'
import {
  resolveConfig,
  type InlineConfig,
  type ResolvedConfig,
} from './config/index.ts'
import { attw } from './features/attw.ts'
import { warnLegacyCJS } from './features/cjs.ts'
import { cleanOutDir } from './features/clean.ts'
import { copy } from './features/copy.ts'
import { writeExports, type TsdownChunks } from './features/exports.ts'
import { createHooks } from './features/hooks.ts'
import { publint } from './features/publint.ts'
import {
  debugBuildOptions,
  getBuildOptions,
  getDebugRolldownDir,
} from './features/rolldown.ts'
import { shortcuts } from './features/shortcuts.ts'
import { watchBuild } from './features/watch.ts'
import { fsRemove } from './utils/fs.ts'
import { globalLogger, prettyName, type Logger } from './utils/logger.ts'

/**
 * Build with tsdown.
 */
export async function build(userOptions: InlineConfig = {}): Promise<void> {
  globalLogger.level =
    userOptions.logLevel || (userOptions.silent ? 'error' : 'info')
  const { configs, files: configFiles } = await resolveConfig(userOptions)

  let cleanPromise: Promise<void> | undefined
  const clean = () => {
    if (cleanPromise) return cleanPromise
    return (cleanPromise = cleanOutDir(configs))
  }

  globalLogger.info('Build start')
  const rebuilds = await Promise.all(
    configs.map((options) => buildSingle(options, clean)),
  )
  const disposeCbs: (() => void | Promise<void>)[] = []

  for (const [i, config] of configs.entries()) {
    const rebuild = rebuilds[i]
    if (!rebuild) continue

    const watcher = await watchBuild(config, configFiles, rebuild, restart)
    disposeCbs.push(() => watcher.close())
  }

  let devtools = configs.some((config) => config.debug && config.debug.devtools)
  if (disposeCbs.length && devtools) {
    globalLogger.warn(
      'Debug mode and devtools are not supported in watch mode.',
    )
    devtools = false
  }
  if (devtools) {
    const devtools = require.resolve('@vitejs/devtools/cli')
    await fsRemove(path.resolve(process.cwd(), '.rolldown/unknown-session'))
    await exec(process.execPath, [devtools], {
      nodeOptions: { stdio: 'inherit' },
    })
  }

  // Watch mode with shortcuts
  if (disposeCbs.length) {
    disposeCbs.push(shortcuts(restart))
  }

  async function restart() {
    for (const dispose of disposeCbs) {
      await dispose()
    }
    build(userOptions)
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
  config: ResolvedConfig,
  clean: () => Promise<void>,
): Promise<(() => Promise<void>) | undefined> {
  const { format: formats, dts, watch, onSuccess, logger } = config
  let ab: AbortController | undefined

  const { hooks, context } = await createHooks(config)

  warnLegacyCJS(config)

  await rebuild(true)
  if (watch) {
    return () => rebuild()
  }

  async function rebuild(first?: boolean) {
    const startTime = performance.now()

    await hooks.callHook('build:prepare', context)
    ab?.abort()

    if (first) {
      await clean()
    } else {
      await cleanOutDir([config])
    }

    let hasErrors = false
    const isMultiFormat = formats.length > 1
    const chunks: TsdownChunks = {}
    const debugRolldownDir = await getDebugRolldownDir()

    await Promise.all(
      formats.map(async (format) => {
        try {
          const buildOptions = await getBuildOptions(
            config,
            format,
            isMultiFormat,
            false,
          )
          await hooks.callHook('build:before', {
            ...context,
            buildOptions,
          })
          if (debugRolldownDir) {
            await debugBuildOptions(
              debugRolldownDir,
              config.name,
              format,
              buildOptions,
            )
          }
          const { output } = await rolldownBuild(buildOptions)
          chunks[format] = output
          if (format === 'cjs' && dts) {
            const { output } = await rolldownBuild(
              await getBuildOptions(config, format, isMultiFormat, true),
            )
            chunks[format].push(...output)
          }
        } catch (error) {
          if (watch) {
            logger.error(error)
            hasErrors = true
            return
          }
          throw error
        }
      }),
    )

    if (hasErrors) {
      return
    }

    await Promise.all([writeExports(config, chunks), copy(config)])
    await Promise.all([publint(config), attw(config)])

    await hooks.callHook('build:done', context)

    logger.success(
      prettyName(config.name),
      `${first ? 'Build' : 'Rebuild'} complete in ${green(`${Math.round(performance.now() - startTime)}ms`)}`,
    )
    ab = new AbortController()
    if (typeof onSuccess === 'string') {
      const p = exec(onSuccess, [], {
        nodeOptions: {
          shell: true,
          stdio: 'inherit',
        },
      })
      p.then(({ exitCode }) => {
        if (exitCode) {
          process.exitCode = exitCode
        }
      })
      ab.signal.addEventListener('abort', () => {
        if (typeof p.pid === 'number') {
          treeKill(p.pid)
        }
      })
    } else {
      await onSuccess?.(config, ab.signal)
    }
  }
}

export { defineConfig } from './config.ts'
export * from './config/types.ts'
export { globalLogger, type Logger }
