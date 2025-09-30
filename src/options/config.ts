import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { underline } from 'ansis'
import { loadConfig } from 'unconfig'
import { fsStat } from '../utils/fs'
import { toArray } from '../utils/general'
import { globalLogger } from '../utils/logger'
import type {
  NormalizedUserConfig,
  Options,
  UserConfig,
  UserConfigFn,
} from './types'
import type {
  ConfigEnv,
  UserConfig as ViteUserConfig,
  UserConfigExport as ViteUserConfigExport,
} from 'vite'

export async function loadViteConfig(
  prefix: string,
  cwd: string,
): Promise<ViteUserConfig | undefined> {
  const {
    config,
    sources: [source],
  } = await loadConfig<ViteUserConfigExport>({
    sources: [
      {
        files: `${prefix}.config`,
        extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
      },
    ],
    cwd,
    defaults: {},
  })
  if (!source) return
  globalLogger.info(`Using Vite config: ${underline(source)}`)

  const resolved = await config
  if (typeof resolved === 'function') {
    return resolved({
      command: 'build',
      mode: 'production',
    } satisfies ConfigEnv)
  }
  return resolved
}

let loaded = false

export async function loadConfigFile(
  options: Options,
  workspace?: string,
): Promise<{
  configs: NormalizedUserConfig[]
  file?: string
}> {
  let cwd = options.cwd || process.cwd()
  let overrideConfig = false

  let { config: filePath } = options
  if (filePath === false) return { configs: [{}] }

  if (typeof filePath === 'string') {
    const stats = await fsStat(filePath)
    if (stats) {
      const resolved = path.resolve(filePath)
      if (stats.isFile()) {
        overrideConfig = true
        filePath = resolved
        cwd = path.dirname(filePath)
      } else if (stats.isDirectory()) {
        cwd = resolved
      }
    }
  }

  let isNative = false
  if (!loaded) {
    if (!options.configLoader || options.configLoader === 'auto') {
      isNative = !!(
        process.features.typescript ||
        process.versions.bun ||
        process.versions.deno
      )
    } else if (options.configLoader === 'native') {
      isNative = true
    }
  }

  let { config, sources } = await loadConfig
    .async<UserConfig | UserConfigFn>({
      sources: overrideConfig
        ? [{ files: filePath as string, extensions: [] }]
        : [
            {
              files: 'tsdown.config',
              extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
              parser: isNative ? nativeImport : 'auto',
            },
            {
              files: 'package.json',
              extensions: [],
              rewrite: (config: any) => config?.tsdown,
            },
          ],
      cwd,
      stopAt: workspace && path.dirname(workspace),
      defaults: {},
    })
    .finally(() => (loaded = true))

  if (typeof config === 'function') {
    config = await config(options)
  }
  config = toArray(config)
  if (config.length === 0) {
    config.push({})
  }

  const file = sources[0]
  if (file) {
    globalLogger.info(`Using tsdown config: ${underline(file)}`)
  }
  return {
    configs: config,
    file,
  }
}

async function nativeImport(id: string) {
  const mod = await import(pathToFileURL(id).href).catch((error) => {
    const cannotFindModule = error?.message?.includes?.('Cannot find module')
    if (cannotFindModule) {
      const configError = new Error(
        `Failed to load the config file. Try setting the --config-loader CLI flag to \`unconfig\`.\n\n${error.message}`,
      )
      configError.cause = error
      throw configError
    } else {
      throw error
    }
  })
  const config = mod.default || mod
  return config
}
