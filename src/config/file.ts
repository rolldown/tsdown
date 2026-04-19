import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { depsStore, init, isSupported } from 'import-without-cache'
import isInCi from 'is-in-ci'
import { createDebug } from 'obug'
import { createConfigCoreLoader } from 'unconfig-core'
import { fsStat } from '../utils/fs.ts'
import { toArray } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import { underline } from '../utils/style.ts'
import type { InlineConfig, UserConfig, UserConfigExport } from './types.ts'
import type {
  ConfigEnv,
  UserConfig as ViteUserConfig,
  UserConfigExport as ViteUserConfigExport,
} from 'vite'

const debug = createDebug('tsdown:config:file')

export async function loadViteConfig(
  prefix: string,
  cwd: string,
  configLoader: InlineConfig['configLoader'],
): Promise<{ config: ViteUserConfig; deps?: Set<string> } | undefined> {
  const loader = resolveConfigLoader(configLoader)
  debug('Loading Vite config via loader: ', loader)
  const parser = createParser(loader)
  const [result] = await createConfigCoreLoader<
    [exported: ViteUserConfigExport, deps: Set<string>]
  >({
    sources: [
      {
        files: [`${prefix}.config`],
        extensions: ['js', 'mjs', 'ts', 'cjs', 'mts', 'cts'],
        parser,
      },
    ],
    cwd,
  }).load(true)
  if (!result) return

  let {
    config: [exported, deps],
    source,
  } = result
  globalLogger.info(`Using Vite config: ${underline(source)}`)

  exported = await exported
  if (typeof exported === 'function') {
    exported = await exported({
      command: 'build',
      mode: 'production',
    } satisfies ConfigEnv)
  }

  return {
    config: exported,
    deps,
  }
}

const configPrefix = 'tsdown.config'

export async function loadConfigFile(
  inlineConfig: InlineConfig,
  workspace?: string,
  rootConfig?: UserConfig,
): Promise<{
  configs: UserConfig[]
  deps?: Set<string>
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
          extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json'],
          parser,
        },
        { files: ['package.json'], parser },
      ]

  const [result] = await createConfigCoreLoader<
    [exported: UserConfigExport, deps: Set<string>]
  >({
    sources,
    cwd,
    stopAt: workspace && path.dirname(workspace),
  }).load(true)

  let exported: UserConfigExport = []
  let file: string | undefined
  let deps: Set<string> | undefined
  if (result) {
    ;({
      config: [exported, deps],
      source: file,
    } = result)

    globalLogger.info(
      `config file: ${underline(file)}`,
      loader === 'native' ? '' : `(${loader})`,
    )

    exported = await exported
    if (typeof exported === 'function') {
      exported = await exported(inlineConfig, { ci: isInCi, rootConfig })
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
    configs: exported.map((config) => ({
      ...config,
      cwd: config.cwd ? path.resolve(cwd, config.cwd) : cwd,
    })),
    deps,
  }
}

type Parser = 'native' | 'unrun'

const isBun = !!process.versions.bun
const nativeTS = process.features.typescript || process.versions.deno
const autoLoader = isBun || (nativeTS && isSupported) ? 'native' : 'unrun'

function resolveConfigLoader(
  configLoader: InlineConfig['configLoader'] = 'auto',
): Parser {
  if (configLoader === 'auto') {
    return autoLoader
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
      const config = isPkgJson ? parsed?.tsdown : parsed
      return [config, new Set([filepath])]
    }

    return (loader === 'native' ? nativeImport : unrunImport)(filepath)
  }
}

async function nativeImport(
  id: string,
): Promise<[module: unknown, deps: Set<string>]> {
  const deps = new Set<string>([id])

  const url = pathToFileURL(id)
  const importAttributes: Record<string, string> = Object.create(null)
  if (isSupported) {
    importAttributes.cache = 'no'
    init({ skipNodeModules: true })
  } else if (!isBun) {
    url.searchParams.set('no-cache', crypto.randomUUID())
  }

  const mod = await depsStore.run(deps, () =>
    import(url.href, {
      with: importAttributes,
    }).catch((error) => {
      const cannotFindModule = error?.message?.includes?.('Cannot find module')
      if (cannotFindModule) {
        const configError = new Error(
          `Failed to load the config file. Try setting the --config-loader CLI flag to \`unrun\`.\n\n${error.message}`,
          { cause: error },
        )
        throw configError
      }

      const nodeInternalBug =
        typeof error?.stack === 'string' &&
        error.stack.includes('node:internal/modules/esm/translators')
      if (nodeInternalBug) {
        const configError = new Error(
          `Failed to load the config file due to a known Node.js bug. Try setting the --config-loader CLI flag to \`unrun\` or upgrading Node.js to v24.11.1 or later.\n\n${error.message}`,
          { cause: error },
        )
        throw configError
      }

      throw error
    }),
  )

  const config = mod.default || mod
  return [config, deps]
}

async function unrunImport(
  id: string,
): Promise<[module: unknown, deps: Set<string>]> {
  const { unrun } = await import('unrun')
  const { module, dependencies } = await unrun({
    path: pathToFileURL(id).href,
  })

  return [module, new Set(dependencies)]
}
