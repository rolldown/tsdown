import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import util, { type InspectOptionsStylized } from 'node:util'
import Debug from 'debug'
import {
  VERSION as rolldownVersion,
  type BuildOptions,
  type InputOptions,
  type OutputOptions,
  type RolldownPluginOption,
} from 'rolldown'
import { importGlobPlugin } from 'rolldown/experimental'
import { version } from '../../package.json'
import {
  mergeUserOptions,
  type DtsOptions,
  type NormalizedFormat,
  type ResolvedOptions,
} from '../options'
import { lowestCommonAncestor } from '../utils/fs'
import { LogLevels } from '../utils/logger'
import { ExternalPlugin } from './external'
import { LightningCSSPlugin } from './lightningcss'
import { NodeProtocolPlugin } from './node-protocol'
import { resolveChunkAddon, resolveChunkFilename } from './output'
import { ReportPlugin } from './report'
import { ShebangPlugin } from './shebang'
import { getShimsInject } from './shims'

const debug = Debug('tsdown:rolldown')

export async function getBuildOptions(
  config: ResolvedOptions,
  format: NormalizedFormat,
  isMultiFormat?: boolean,
  cjsDts: boolean = false,
): Promise<BuildOptions> {
  const inputOptions = await resolveInputOptions(
    config,
    format,
    cjsDts,
    isMultiFormat,
  )

  const outputOptions: OutputOptions = await resolveOutputOptions(
    inputOptions,
    config,
    format,
    cjsDts,
  )

  const rolldownConfig: BuildOptions = {
    ...inputOptions,
    output: outputOptions,
  }
  debug(
    'rolldown config with format "%s" %O',
    cjsDts ? 'cjs dts' : format,
    rolldownConfig,
  )

  return rolldownConfig
}

export async function resolveInputOptions(
  config: ResolvedOptions,
  format: NormalizedFormat,
  cjsDts: boolean,
  isMultiFormat?: boolean,
): Promise<InputOptions> {
  const {
    entry,
    external,
    plugins: userPlugins,
    platform,
    alias,
    treeshake,
    dts,
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
    logger,
    cjsDefault,
    banner,
    footer,
    globImport,
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
    const options: DtsOptions = {
      tsconfig,
      banner: resolveChunkAddon(banner, format, true),
      footer: resolveChunkAddon(footer, format, true),
      ...dts,
    }

    if (format === 'es') {
      plugins.push(dtsPlugin(options))
    } else if (cjsDts) {
      plugins.push(
        dtsPlugin({
          ...options,
          emitDtsOnly: true,
          cjsDefault,
        }),
      )
    }
  }
  if (!cjsDts) {
    if (unused) {
      const { Unused } = await import('unplugin-unused')
      plugins.push(Unused.rolldown(unused === true ? {} : unused))
    }
    if (target) {
      plugins.push(
        // Use Lightning CSS to handle CSS input. This is a temporary solution
        // until Rolldown supports CSS syntax lowering natively.
        await LightningCSSPlugin({ target }),
      )
    }
    plugins.push(ShebangPlugin(logger, cwd, name, isMultiFormat))
    if (globImport) {
      plugins.push(importGlobPlugin())
    }
  }

  if (report && LogLevels[logger.level] >= 3 /* info */) {
    plugins.push(ReportPlugin(report, logger, cwd, cjsDts, name, isMultiFormat))
  }

  if (!cjsDts) {
    plugins.push(userPlugins)
  }

  const inputOptions = await mergeUserOptions(
    {
      input: entry,
      cwd,
      external,
      resolve: {
        alias,
      },
      tsconfig: tsconfig || undefined,
      treeshake,
      platform: cjsDts || format === 'cjs' ? 'node' : platform,
      transform: {
        target,
        define: {
          ...define,
          ...Object.keys(env).reduce((acc, key) => {
            const value = JSON.stringify(env[key])
            acc[`process.env.${key}`] = value
            acc[`import.meta.env.${key}`] = value
            return acc
          }, Object.create(null)),
        },
        inject: {
          ...(shims && !cjsDts && getShimsInject(format, platform)),
        },
      },
      plugins,
      moduleTypes: loader,
      logLevel: logger.level === 'error' ? 'silent' : logger.level,
      onLog: cjsDefault
        ? (level, log, defaultHandler) => {
            // suppress mixed export warnings if cjsDefault is enabled
            if (log.code === 'MIXED_EXPORT') return
            defaultHandler(level, log)
          }
        : undefined,
    },
    config.inputOptions,
    [format, { cjsDts }],
  )

  return inputOptions
}

export async function resolveOutputOptions(
  inputOptions: InputOptions,
  config: ResolvedOptions,
  format: NormalizedFormat,
  cjsDts: boolean,
): Promise<OutputOptions> {
  const {
    entry,
    outDir,
    sourcemap,
    minify,
    unbundle,
    banner,
    footer,
    cjsDefault,
  } = config

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
      exports: cjsDefault ? 'auto' : 'named',
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
  return outputOptions
}

export async function getDebugRolldownDir(): Promise<string | undefined> {
  if (!debug.enabled) return
  return await mkdtemp(join(tmpdir(), 'tsdown-config-'))
}

export async function debugBuildOptions(
  dir: string,
  name: string | undefined,
  format: NormalizedFormat,
  buildOptions: BuildOptions,
): Promise<void> {
  const outFile = join(dir, `tsdown.config.${format}.js`)

  handlePluginInspect(buildOptions.plugins)
  const serialized = util.formatWithOptions(
    {
      depth: null,
      maxArrayLength: null,
      maxStringLength: null,
    },
    buildOptions,
  )
  const code = `/*
Auto-generated rolldown config for tsdown debug purposes
tsdown v${version}, rolldown v${rolldownVersion}
Generated on ${new Date().toISOString()}
Package name: ${name || 'not specified'}
*/

export default ${serialized}\n`
  await writeFile(outFile, code)
  debug(
    'Wrote debug rolldown config for "%s" (%s) -> %s',
    name || 'default name',
    format,
    outFile,
  )
}

function handlePluginInspect(plugins: RolldownPluginOption) {
  if (Array.isArray(plugins)) {
    for (const plugin of plugins) {
      handlePluginInspect(plugin)
    }
  } else if (
    typeof plugins === 'object' &&
    plugins !== null &&
    'name' in plugins
  ) {
    ;(plugins as any)[util.inspect.custom] = function (
      depth: number,
      options: InspectOptionsStylized,
      inspect: typeof util.inspect,
    ) {
      if ('_options' in plugins) {
        return inspect(
          { name: plugins.name, options: (plugins as any)._options },
          options,
        )
      } else {
        return `"rolldown plugin: ${plugins.name}"`
      }
    }
  }
}
