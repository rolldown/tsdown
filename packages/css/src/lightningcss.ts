import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ResolverFactory } from 'rolldown/experimental'
import { compilePreprocessor, getPreprocessorLang } from './preprocessors.ts'
import type { Targets } from 'lightningcss'
import type { LightningCSSOptions, PreprocessorOptions } from 'tsdown/css'

let resolver: ResolverFactory | undefined
function getResolver(): ResolverFactory {
  return (resolver ??= new ResolverFactory({
    conditionNames: ['style', 'default'],
  }))
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export interface TransformCssOptions {
  target?: string[]
  lightningcss?: LightningCSSOptions
  minify?: boolean
}

export interface BundleCssOptions {
  target?: string[]
  lightningcss?: LightningCSSOptions
  minify?: boolean
  preprocessorOptions?: PreprocessorOptions
}

export interface BundleCssResult {
  code: string
  deps: string[]
}

export async function transformWithLightningCSS(
  code: string,
  filename: string,
  options: TransformCssOptions,
): Promise<string> {
  const targets =
    options.lightningcss?.targets ??
    (options.target ? esbuildTargetToLightningCSS(options.target) : undefined)
  if (!targets && !options.lightningcss && !options.minify) {
    return code
  }

  const { transform } = await import('lightningcss')
  const result = transform({
    filename,
    code: encoder.encode(code),
    ...options.lightningcss,
    targets,
    minify: options.minify,
  })

  return decoder.decode(result.code)
}

export async function bundleWithLightningCSS(
  filename: string,
  options: BundleCssOptions,
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
    resolver: {
      async read(filePath: string) {
        // Note: LightningCSS explicitly recommends using `readFileSync` instead
        // of `readFile` for better performance.
        const code = readFileSync(filePath, 'utf8')
        const lang = getPreprocessorLang(filePath)
        if (lang) {
          const preprocessed = await compilePreprocessor(
            lang,
            code,
            filePath,
            options.preprocessorOptions,
          )
          deps.push(...preprocessed.deps)
          return preprocessed.code
        }
        return code
      },
      resolve(specifier: string, from: string) {
        const dir = path.dirname(from)
        const result = getResolver().sync(dir, specifier)
        if (result.error || !result.path) {
          console.warn(
            `[@tsdown/css] Failed to resolve import '${specifier}' from '${from}': ${result.error || 'unknown error'}`,
          )
          return path.resolve(dir, specifier)
        }
        return result.path
      },
    },
  })

  return {
    code: new TextDecoder().decode(result.code),
    deps,
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
