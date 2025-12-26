import { RE_CSS, RE_JS } from 'rolldown-plugin-dts/filename'
import type { ResolvedConfig } from '../config/index.ts'
import type { OutputAsset, OutputChunk, Plugin } from 'rolldown'

export interface CssOptions {
  /**
   * Enable/disable CSS code splitting.
   * When set to `false`, all CSS in the entire project will be extracted into a single CSS file.
   * When set to `true`, CSS imported in async JS chunks will be preserved as chunks.
   * @default true
   */
  splitting?: boolean

  /**
   * Specify the name of the CSS file.
   * @default 'style.css'
   */
  fileName?: string
}

// Regular expressions for file matching
const RE_CSS_HASH = /-[\w-]+\.css$/
const RE_CHUNK_HASH = /-[\w-]+\.(m?js|cjs)$/
const RE_CHUNK_EXT = /\.(m?js|cjs)$/

export const defaultCssBundleName = 'style.css'

/**
 * CSS Entry Plugin
 *
 * When a CSS file is used as an entry alongside a JS file with the same base name,
 * rolldown generates an empty JS file that can overwrite the legitimate JS output.
 *
 * This plugin handles this conflict by:
 * 1. Removing empty JS files generated from CSS-only entries that would conflict
 *    (but NOT those imported by other JS, and NOT when there's no conflict)
 * 2. Renaming CSS files to remove double extensions (e.g., index.css.css -> index.css)
 */
export function CssEntryPlugin(): Plugin {
  return {
    name: 'tsdown:css-entry',

    generateBundle(_outputOptions, bundle) {
      // First, collect all JS files that are imported by other chunks
      // These should NOT be deleted even if they are empty CSS-only chunks
      const importedFiles = new Set<string>()
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk') {
          for (const imp of chunk.imports) {
            importedFiles.add(imp)
          }
          for (const imp of chunk.dynamicImports) {
            importedFiles.add(imp)
          }
        }
      }

      // Find empty JS chunks from CSS-only entries with ".css" in the name
      // These are the ones we added ".css" suffix to avoid conflicts
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue
        if (!RE_JS.test(fileName)) continue
        if (!chunk.isEntry) continue

        // Only process chunks whose name contains ".css" (conflict resolution naming)
        // e.g., "index.css.mjs" from entry "index.css"
        if (!chunk.name.endsWith('.css')) continue

        // Skip if this file is imported by other chunks
        if (importedFiles.has(fileName)) continue

        // Check if this chunk only contains CSS modules
        const moduleIds = Object.keys(chunk.modules)
        const hasCssModules = moduleIds.some((id) => RE_CSS.test(id))
        const hasNonCssModules = moduleIds.some((id) => !RE_CSS.test(id))

        // If chunk only has CSS modules and the code is empty, remove it
        if (hasCssModules && !hasNonCssModules && chunk.code.trim() === '') {
          delete bundle[fileName]
        }
      }

      // Rename CSS files with double extensions (e.g., index.css.css -> index.css)
      // This only happens for CSS entries that were renamed to avoid conflicts
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset') continue
        if (!RE_CSS.test(fileName)) continue

        // Check if this is a CSS file with double .css extension (e.g., index.css.css)
        const doubleCssMatch = fileName.match(/^(.+\.css)\.css$/)
        if (doubleCssMatch) {
          const newFileName = doubleCssMatch[1]
          // Only rename if the new name doesn't conflict with existing files
          if (!bundle[newFileName]) {
            asset.fileName = newFileName
          }
        }
      }
    },
  }
}

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
 * When css.splitting is false, this plugin merges all CSS files into a single file.
 * When css.splitting is true (default), CSS code splitting is preserved.
 * Based on Vite's implementation.
 */
export function CssCodeSplitPlugin(
  config: Pick<ResolvedConfig, 'css'>,
): Plugin | undefined {
  const { splitting, fileName } = config.css
  if (splitting) return

  let hasEmitted = false

  return {
    name: 'tsdown:css-code-split',

    renderStart() {
      // Reset state for each build for watch mode
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

      if (!cssAssets.size) return

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
          fileName,
          // this file is an implicit entry point, use `style.css` as the original file name
          originalFileName: defaultCssBundleName,
        })
      }
    },
  }
}
