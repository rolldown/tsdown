import { readFileSync } from 'node:fs'
import path from 'node:path'
import { extractLightningCssModuleExports } from './modules.ts'
import { compilePreprocessor, getPreprocessorLang } from './preprocessors.ts'
import { getCssResolver, resolveWithResolver } from './resolve.ts'
import type { LightningCSSOptions, PreprocessorOptions } from './options.ts'
import type { CSSModulesConfig, Targets } from 'lightningcss'
import type { Logger } from 'tsdown/internal'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export interface TransformCssOptions {
  target?: string[]
  lightningcss?: LightningCSSOptions
  minify?: boolean
  cssModules?: boolean | CSSModulesConfig
}

export interface TransformCssResult {
  code: string
  modules?: Record<string, string>
}

export interface BundleCssOptions {
  target?: string[]
  lightningcss?: LightningCSSOptions
  minify?: boolean
  cssModules?: boolean | CSSModulesConfig
  preprocessorOptions?: PreprocessorOptions
  logger: Logger
}

export interface BundleCssResult {
  code: string
  deps: string[]
  modules?: Record<string, string>
}

export async function transformWithLightningCSS(
  code: string,
  filename: string,
  options: TransformCssOptions,
): Promise<TransformCssResult> {
  const targets =
    options.lightningcss?.targets ??
    (options.target ? esbuildTargetToLightningCSS(options.target) : undefined)
  if (
    !targets &&
    !options.lightningcss &&
    !options.minify &&
    !options.cssModules
  ) {
    return { code }
  }

  const { transform } = await import('lightningcss')
  const result = transform({
    filename,
    code: encoder.encode(code),
    ...options.lightningcss,
    targets,
    minify: options.minify,
    cssModules: options.cssModules,
  })

  return {
    code: decoder.decode(result.code),
    modules: result.exports
      ? extractLightningCssModuleExports(result.exports)
      : undefined,
  }
}

export async function bundleWithLightningCSS(
  filename: string,
  options: BundleCssOptions,
  code?: string,
): Promise<BundleCssResult> {
  const targets =
    options.lightningcss?.targets ??
    (options.target ? esbuildTargetToLightningCSS(options.target) : undefined)

  const deps: string[] = []

  const { bundleAsync } = await import('lightningcss')
  const result = await bundleAsync({
    filename,
    ...options.lightningcss,
    targets,
    minify: options.minify,
    cssModules: options.cssModules,
    resolver: {
      async read(filePath: string) {
        let fileCode: string
        if (code != null && filePath === filename) {
          fileCode = code
        } else {
          // Note: LightningCSS explicitly recommends using `readFileSync` instead
          // of `readFile` for better performance.
          fileCode = readFileSync(filePath, 'utf8')
        }
        const lang = getPreprocessorLang(filePath)
        if (lang) {
          const preprocessed = await compilePreprocessor(
            lang,
            fileCode,
            filePath,
            options.preprocessorOptions,
          )
          deps.push(...preprocessed.deps)
          return preprocessed.code
        }
        return fileCode
      },
      resolve(specifier: string, from: string) {
        const resolved = resolveWithResolver(getCssResolver(), specifier, from)
        if (!resolved) {
          options.logger.warn(
            `[@tsdown/css] Failed to resolve import '${specifier}' from '${from}'`,
          )
          return path.resolve(path.dirname(from), specifier)
        }
        return resolved
      },
    },
  })

  return {
    code: new TextDecoder().decode(result.code),
    deps,
    modules: result.exports
      ? extractLightningCssModuleExports(result.exports)
      : undefined,
  }
}

const TARGET_REGEX = /([a-z]+)(\d+(?:\.\d+)*)/g

const ESBUILD_LIGHTNINGCSS_MAPPING: Record<string, keyof Targets> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  ie: 'ie',
  ios: 'ios_saf',
  opera: 'opera',
  safari: 'safari',
}

function parseVersion(version: string): number | null {
  const [major, minor = 0, patch = 0] = version
    .split('-')[0]
    .split('.')
    .map((v) => Number.parseInt(v, 10))

  if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    return null
  }

  return (major << 16) | (minor << 8) | patch
}

export function esbuildTargetToLightningCSS(
  target: string[],
): Targets | undefined {
  let targets: Targets | undefined

  const targetString = target.join(' ').toLowerCase()
  const matches = [...targetString.matchAll(TARGET_REGEX)]

  for (const match of matches) {
    const name = match[1]
    const browser = ESBUILD_LIGHTNINGCSS_MAPPING[name]
    if (!browser) {
      continue
    }

    const version = match[2]
    const versionInt = parseVersion(version)
    if (versionInt == null) {
      continue
    }

    targets = targets || {}
    targets[browser] = versionInt
  }

  return targets
}
