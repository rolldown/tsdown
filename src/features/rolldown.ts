import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { formatWithOptions, inspect, type Inspectable } from 'node:util'
import { createDebug } from 'obug'
import {
  VERSION as rolldownVersion,
  type BuildOptions,
  type InputOptions,
  type OutputOptions,
  type Plugin,
  type RolldownPluginOption,
} from 'rolldown'
import { importGlobPlugin } from 'rolldown/experimental'
import pkg from '../../package.json' with { type: 'json' }
import { mergeUserOptions } from '../config/options.ts'
import { importWithError, pkgExists } from '../utils/general.ts'
import { LogLevels } from '../utils/logger.ts'
import { DepsPlugin } from './deps.ts'
import { NodeProtocolPlugin } from './node-protocol.ts'
import { resolveChunkAddon, resolveChunkFilename } from './output.ts'
import { ReportPlugin } from './report.ts'
import { ShebangPlugin } from './shebang.ts'
import { getShimsInject } from './shims.ts'
import { WatchPlugin } from './watch.ts'
import type {
  DtsOptions,
  NormalizedFormat,
  ResolvedConfig,
  TsdownBundle,
} from '../config/index.ts'

const debug = createDebug('tsdown:rolldown')

export async function getBuildOptions(
  config: ResolvedConfig,
  format: NormalizedFormat,
  configFiles: string[],
  bundle: TsdownBundle,
  cjsDts: boolean = false,
  isDualFormat?: boolean,
): Promise<BuildOptions> {
  const inputOptions = await resolveInputOptions(
    config,
    format,
    configFiles,
    bundle,
    cjsDts,
    isDualFormat,
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
    write: config.write,
  }
  debug(
    'rolldown config with format "%s" %O',
    cjsDts ? 'cjs dts' : format,
    rolldownConfig,
  )

  return rolldownConfig
}

async function resolveInputOptions(
  config: ResolvedConfig,
  format: NormalizedFormat,
  configFiles: string[],
  bundle: TsdownBundle,
  cjsDts: boolean,
  isDualFormat?: boolean,
): Promise<InputOptions> {
  /// keep-sorted
  const {
    alias,
    checks: { legacyCjs, ...checks } = {},
    cjsDefault,
    cwd,
    deps: { neverBundle },
    devtools,
    dts,
    entry,
    env,
    globImport,
    loader,
    logger,
    nameLabel,
    nodeProtocol,
    platform,
    plugins: userPlugins,
    report,
    shims,
    target,
    treeshake,
    tsconfig,
    unused,
    watch,
  } = config

  const plugins: RolldownPluginOption = []

  if (nodeProtocol) {
    plugins.push(NodeProtocolPlugin(nodeProtocol))
  }

  if (config.pkg || config.deps.skipNodeModulesBundle) {
    plugins.push(DepsPlugin(config, bundle))
  }

  if (dts) {
    const { dts: dtsPlugin } = await import('rolldown-plugin-dts')
    const { cjsReexport: _, ...dtsPluginOptions } = dts
    const options: DtsOptions = {
      tsconfig,
      ...dtsPluginOptions,
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
    } else if (dts.cjsReexport && isDualFormat) {
      plugins.push(CjsDtsReexportPlugin())
    }
  }
  let cssPostPlugins: Plugin[] | undefined
  if (!cjsDts) {
    if (unused) {
      const { Unused } =
        await importWithError<typeof import('unplugin-unused')>(
          'unplugin-unused',
        )
      plugins.push(
        Unused.rolldown({
          root: cwd,
          ...unused,
        }),
      )
    }

    if (pkgExists('@tsdown/css')) {
      const { CssPlugin } = await import('@tsdown/css')
      const cssPlugins = CssPlugin(config, { logger })
      plugins.push(...cssPlugins.pre)
      cssPostPlugins = cssPlugins.post
    } else {
      plugins.push(CssGuardPlugin())
    }

    plugins.push(ShebangPlugin(logger, cwd, nameLabel, isDualFormat))
    if (globImport) {
      plugins.push(importGlobPlugin({ root: cwd }))
    }
  }

  if (report && LogLevels[logger.level] >= 3 /* info */) {
    plugins.push(ReportPlugin(config, cjsDts, isDualFormat))
  }

  if (watch) {
    plugins.push(WatchPlugin(configFiles, bundle))
  }

  if (!cjsDts) {
    plugins.push(userPlugins)
  }

  // CSS post plugins must run AFTER user plugins so that user transforms
  // (e.g. Vue scoped CSS) are applied before CSS is collected and emitted.
  if (cssPostPlugins) {
    plugins.push(...cssPostPlugins)
  }

  const define = {
    ...config.define,
    ...Object.keys(env).reduce((acc, key) => {
      const value = JSON.stringify(env[key])
      acc[`process.env.${key}`] = value
      acc[`import.meta.env.${key}`] = value
      return acc
    }, Object.create(null)),
  }
  const inject = shims && !cjsDts ? getShimsInject(format, platform) : undefined

  const inputOptions = await mergeUserOptions(
    {
      input: entry,
      cwd,
      external: neverBundle,
      resolve: {
        alias,
      },
      tsconfig: tsconfig || undefined,
      treeshake,
      platform: cjsDts || format === 'cjs' ? 'node' : platform,
      transform: {
        target,
        define,
        inject,
      },
      plugins,
      moduleTypes: {
        '.node': 'copy',
        ...loader,
      },
      logLevel: logger.level === 'error' ? 'silent' : logger.level,
      onLog(level, log, defaultHandler) {
        // suppress mixed export warnings if cjsDefault is enabled
        if (cjsDefault && log.code === 'MIXED_EXPORT') return
        if (
          logger.options?.failOnWarn &&
          level === 'warn' &&
          log.code !== 'PLUGIN_TIMINGS'
        )
          defaultHandler('error', log)
        defaultHandler(level, log)
      },
      devtools: devtools || undefined,
      checks,
    },
    config.inputOptions,
    [format, { cjsDts }],
  )

  return inputOptions
}

async function resolveOutputOptions(
  inputOptions: InputOptions,
  config: ResolvedConfig,
  format: NormalizedFormat,
  cjsDts: boolean,
): Promise<OutputOptions> {
  /// keep-sorted
  const { banner, cjsDefault, footer, minify, outDir, sourcemap, unbundle } =
    config

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
      preserveModulesRoot: unbundle ? config.root : undefined,
      postBanner: resolveChunkAddon(banner, format),
      postFooter: resolveChunkAddon(footer, format),
      codeSplitting: config.exe ? false : undefined,
    },
    config.outputOptions,
    [format, { cjsDts }],
  )
  return outputOptions
}

export async function getDebugRolldownDir(): Promise<string | undefined> {
  if (!debug.enabled) return
  return await mkdtemp(path.join(tmpdir(), 'tsdown-config-'))
}

export async function debugBuildOptions(
  dir: string,
  name: string | undefined,
  format: NormalizedFormat,
  buildOptions: BuildOptions,
): Promise<void> {
  const outFile = path.join(dir, `rolldown.config.${format}.js`)

  handlePluginInspect(buildOptions.plugins)
  const serialized = formatWithOptions(
    {
      depth: null,
      maxArrayLength: null,
      maxStringLength: null,
    },
    buildOptions,
  )
  const code = `/*
Auto-generated rolldown config for tsdown debug purposes
tsdown v${pkg.version}, rolldown v${rolldownVersion}
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
    ;(plugins as any as Inspectable)[inspect.custom] = function (
      depth,
      options,
      inspect,
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

export function CjsDtsReexportPlugin(): Plugin {
  return {
    name: 'tsdown:cjs-dts-reexport',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue

        const match = chunk.fileName.match(/^(.*)\.(cjs|js)$/)
        if (!match) continue

        const baseName = match[1]
        const dCtsName =
          match[2] === 'cjs' ? `${baseName}.d.cts` : `${baseName}.d.ts`
        const dMtsBasename = path.basename(`${baseName}.d.mts`)
        const content = `export * from './${dMtsBasename}'\n`

        this.emitFile({ type: 'asset', fileName: dCtsName, source: content })
      }
    },
  }
}

export function CssGuardPlugin(): Plugin {
  return {
    name: 'tsdown:css-guard',
    transform: {
      order: 'post',
      filter: { id: /\.(?:css|less|sass|scss|styl|stylus)$/ },
      handler(_code, id) {
        throw new Error(
          `CSS file "${id}" was encountered but \`@tsdown/css\` is not installed. ` +
            `Please install it: \`npm install @tsdown/css\``,
        )
      },
    },
  }
}
