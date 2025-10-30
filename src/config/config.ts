import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { underline } from 'ansis'
import { loadConfig } from 'unconfig'
import { fsStat } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import type { InlineConfig, UserConfig, UserConfigExport } from './types.ts'
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
  inlineConfig: InlineConfig,
  workspace?: string,
): Promise<{
  configs: UserConfig[]
  file?: string
}> {
  let cwd = inlineConfig.cwd || process.cwd()
  let overrideConfig = false

  let { config: filePath } = inlineConfig
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
    if (!inlineConfig.configLoader || inlineConfig.configLoader === 'auto') {
      isNative = !!(
        process.features.typescript ||
        process.versions.bun ||
        process.versions.deno
      )
    } else if (inlineConfig.configLoader === 'native') {
      isNative = true
    }
  }

  let { config, sources } = await loadConfig
    .async<UserConfigExport>({
      sources: overrideConfig
        ? [{ files: filePath as string, extensions: [] }]
        : [
            {
              files: 'tsdown.config',
              extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
              parser:
                inlineConfig.configLoader === 'unrun'
                  ? unrunImport
                  : isNative
                    ? nativeImport
                    : 'auto',
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

  config = await config
  if (typeof config === 'function') {
    config = await config(inlineConfig)
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

async function unrunImport(id: string) {
  const { unrun } = await import('unrun')
  const { module } = await unrun({
    path: pathToFileURL(id).href,
  }).catch((error) => {
    const cannotFindModule = error?.message?.includes?.('Cannot find module')
    if (cannotFindModule) {
      const configError = new Error(
        `Failed to load the config file. \`unrun\` is experimental; try setting the --config-loader CLI flag to \`unconfig\` instead.\n\n${error.message}`,
      )
      configError.cause = error
      throw configError
    } else {
      throw error
    }
  })
  return module
}
