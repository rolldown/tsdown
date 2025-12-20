import type { ResolvedConfig } from '../config/index.ts'
import type { OutputAsset, OutputChunk, Plugin } from 'rolldown'

// Regular expressions for file matching
const RE_CSS = /\.css$/
const RE_CSS_HASH = /-[\w-]+\.css$/
const RE_CHUNK_HASH = /-[\w-]+\.(m?js|cjs)$/
const RE_CHUNK_EXT = /\.(m?js|cjs)$/

const defaultCssBundleName = 'style.css'

/**
 * Normalize CSS file name by removing hash pattern and extension.
 * e.g., "async-DcjEOEdU.css" -> "async"
 */
function normalizeCssFileName(cssFileName: string): string {
  return cssFileName.replace(RE_CSS_HASH, '').replace(RE_CSS, '')
}

/**
 * Normalize chunk file name by removing hash pattern and extension.
 * e.g., "async-CvIfFAic.mjs" -> "async"
 */
function normalizeChunkFileName(chunkFileName: string): string {
  return chunkFileName.replace(RE_CHUNK_HASH, '').replace(RE_CHUNK_EXT, '')
}

/**
 * CSS Code Split Plugin
 *
 * When cssCodeSplit is false, this plugin merges all CSS files into a single file.
 * When cssCodeSplit is true (default), CSS code splitting is preserved.
 * Based on Vite's implementation.
 */
export function CssCodeSplitPlugin(
  config: Pick<ResolvedConfig, 'cssCodeSplit'>,
): Plugin | undefined {
  if (config.cssCodeSplit) return undefined

  let hasEmitted = false

  return {
    name: 'tsdown:css-code-split',

    renderStart() {
      // Reset state for each build  for watch mode
      hasEmitted = false
    },

    generateBundle(_outputOptions, bundle) {
      if (hasEmitted) return

      // Collect all CSS assets and their content
      const cssAssets = new Map<string, string>()

      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'asset' && RE_CSS.test(fileName)) {
          const source =
            typeof asset.source === 'string'
              ? asset.source
              : new TextDecoder('utf-8').decode(asset.source)
          cssAssets.set(fileName, source)
        }
      }

      if (cssAssets.size === 0) return

      // Build a map from chunk fileName to its associated CSS fileName(s)
      // Match CSS assets to chunks by analyzing module IDs and file names
      const chunkCSSMap = new Map<string, string[]>()

      // Identify which chunks contain CSS modules
      for (const [chunkFileName, item] of Object.entries(bundle)) {
        if (item.type === 'chunk') {
          for (const moduleId of Object.keys(item.modules)) {
            if (RE_CSS.test(moduleId)) {
              if (!chunkCSSMap.has(chunkFileName)) {
                chunkCSSMap.set(chunkFileName, [])
              }
              break
            }
          }
        }
      }

      // Match CSS assets to chunks by comparing base names
      for (const [cssFileName] of cssAssets) {
        const cssBaseName = normalizeCssFileName(cssFileName)
        for (const [chunkFileName] of chunkCSSMap) {
          const chunkBaseName = normalizeChunkFileName(chunkFileName)
          if (
            chunkBaseName === cssBaseName ||
            chunkFileName.startsWith(`${cssBaseName}-`)
          ) {
            chunkCSSMap.get(chunkFileName)?.push(cssFileName)
            break
          }
        }
      }

      let extractedCss = ''
      const collected = new Set<OutputChunk>()
      const dynamicImports = new Set<string>()

      function collect(chunk: OutputChunk | OutputAsset | undefined) {
        if (!chunk || chunk.type !== 'chunk' || collected.has(chunk)) return
        collected.add(chunk)

        // Collect all styles from synchronous imports (lowest priority)
        chunk.imports.forEach((importName) => {
          collect(bundle[importName])
        })

        // Save dynamic imports to add styles later (highest priority)
        chunk.dynamicImports.forEach((importName) => {
          dynamicImports.add(importName)
        })

        // Collect the styles of the current chunk
        const files = chunkCSSMap.get(chunk.fileName)
        if (files && files.length > 0) {
          for (const filename of files) {
            extractedCss += cssAssets.get(filename) ?? ''
          }
        }
      }

      // Collect CSS from all entry chunks first
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          collect(chunk)
        }
      }

      // Collect CSS from dynamic imports (highest priority)
      for (const chunkName of dynamicImports) {
        collect(bundle[chunkName])
      }

      if (extractedCss) {
        hasEmitted = true

        // Remove all individual CSS assets from bundle
        for (const fileName of cssAssets.keys()) {
          delete bundle[fileName]
        }

        this.emitFile({
          type: 'asset',
          source: extractedCss,
          fileName: defaultCssBundleName,
          originalFileName: defaultCssBundleName,
        })
      }
    },
  }
}
