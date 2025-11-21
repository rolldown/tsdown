import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { underline } from 'ansis'
import { createDebug } from 'obug'
import { createConfigCoreLoader } from 'unconfig-core'
import { fsStat } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import type { InlineConfig, UserConfig, UserConfigExport } from './types.ts'
import type {
  ConfigEnv,
  UserConfig as ViteUserConfig,
  UserConfigExport as ViteUserConfigExport,
} from 'vite'

const debug = createDebug('tsdown:config')

export async function loadViteConfig(
  prefix: string,
  cwd: string,
  configLoader: InlineConfig['configLoader'],
): Promise<ViteUserConfig | undefined> {
  const loader = resolveConfigLoader(configLoader)
  debug('Loading Vite config via loader: ', loader)
  const parser = createParser(loader)
  const [result] = await createConfigCoreLoader<ViteUserConfigExport>({
    sources: [
      {
        files: [`${prefix}.config`],
        extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
        parser,
      },
    ],
    cwd,
  }).load()
  if (!result) return

  const { config, source } = result
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

const configPrefix = 'tsdown.config'
let isWatch = false

export function setWatch(): void {
  isWatch = true
}

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

  const loader = resolveConfigLoader(inlineConfig.configLoader)
  debug('Using config loader:', loader)

  const parser = createParser(loader)
  const sources = overrideConfig
    ? [
        {
          files: [filePath as string],
          extensions: [],
          parser,
        },
      ]
    : [
        {
          files: [configPrefix],
          extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
          parser,
        },
        { files: ['package.json'], parser },
      ]

  const [result] = await createConfigCoreLoader<UserConfigExport>({
    sources,
    cwd,
    stopAt: workspace && path.dirname(workspace),
  }).load(isWatch)

  let exported: UserConfigExport = []
  let file: string | undefined
  if (result) {
    ;({ config: exported, source: file } = result)
    globalLogger.info(`Using tsdown config: ${underline(file)}`)

    exported = await exported
    if (typeof exported === 'function') {
      exported = await exported(inlineConfig)
    }
  }

  exported = toArray(exported)
  if (exported.length === 0) {
    exported.push({})
  }

  if (exported.some((config) => typeof config === 'function')) {
    throw new Error(
      'Function should not be nested within multiple tsdown configurations. It must be at the top level.\nExample: export default defineConfig(() => [...])',
    )
  }

  return {
    configs: exported,
    file,
  }
}

type Parser = 'native' | 'unrun'

function resolveConfigLoader(
  configLoader: InlineConfig['configLoader'] = 'auto',
): Parser {
  if (isWatch) {
    return 'unrun'
  } else if (configLoader === 'auto') {
    const nativeTS = !!(
      process.features.typescript ||
      process.versions.bun ||
      process.versions.deno
    )
    return nativeTS ? 'native' : 'unrun'
  } else {
    return configLoader === 'native' ? 'native' : 'unrun'
  }
}

function createParser(loader: Parser) {
  return async (filepath: string) => {
    const basename = path.basename(filepath)
    const isPkgJson = basename === 'package.json'
    const isJSON =
      basename === configPrefix || isPkgJson || basename.endsWith('.json')
    if (isJSON) {
      const contents = await readFile(filepath, 'utf8')
      const parsed = JSON.parse(contents)
      if (isPkgJson) {
        return parsed?.tsdown
      }
      return parsed
    }

    if (loader === 'native') {
      return nativeImport(filepath)
    }

    return unrunImport(filepath)
  }
}

async function nativeImport(id: string) {
  const mod = await import(pathToFileURL(id).href).catch((error) => {
    const cannotFindModule = error?.message?.includes?.('Cannot find module')
    if (cannotFindModule) {
      const configError = new Error(
        `Failed to load the config file. Try setting the --config-loader CLI flag to \`unrun\`.\n\n${error.message}`,
        { cause: error },
      )
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
  })
  return module
}
