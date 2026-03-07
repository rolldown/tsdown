import path from 'node:path'
import type { CssStyles } from './post.ts'
import type { OutputAsset, OutputChunk } from 'rolldown'

/**
 * Detect and remove "pure CSS chunks" — JS chunks that exist only because
 * they imported CSS files. These chunks have no JS exports and all their
 * modules are CSS. Following Vite's implementation.
 */
export function removePureCssChunks(
  bundle: Record<string, OutputChunk | OutputAsset>,
  styles: CssStyles,
): void {
  const pureCssChunkNames: string[] = []

  // Pass 1: strict — all modules in the chunk are CSS
  for (const chunk of Object.values(bundle)) {
    if (
      chunk.type !== 'chunk' ||
      chunk.exports.length ||
      !chunk.moduleIds.length
    )
      continue
    if (chunk.moduleIds.every((id) => styles.has(id))) {
      pureCssChunkNames.push(chunk.fileName)
    }
  }

  // Pass 2: relaxed — non-entry chunk contains CSS modules and its JS code is
  // trivially empty (e.g. a wrapper like `import './foo.css'` with no logic).
  const strictSet = new Set(pureCssChunkNames)
  for (const chunk of Object.values(bundle)) {
    if (
      chunk.type !== 'chunk' ||
      chunk.exports.length ||
      chunk.isEntry ||
      chunk.isDynamicEntry
    )
      continue
    if (strictSet.has(chunk.fileName)) continue
    if (
      chunk.moduleIds.some((id) => styles.has(id)) &&
      isEmptyChunkCode(chunk.code)
    ) {
      pureCssChunkNames.push(chunk.fileName)
    }
  }

  if (!pureCssChunkNames.length) return

  const replaceEmptyChunk = getEmptyChunkReplacer(pureCssChunkNames)

  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue

    let chunkImportsPureCssChunk = false
    chunk.imports = chunk.imports.filter((importFile) => {
      if (pureCssChunkNames.includes(importFile)) {
        chunkImportsPureCssChunk = true
        return false
      }
      return true
    })

    if (chunkImportsPureCssChunk) {
      chunk.code = replaceEmptyChunk(chunk.code)
    }
  }

  for (const fileName of pureCssChunkNames) {
    delete bundle[fileName]
    delete bundle[`${fileName}.map`]
  }
}

/**
 * Create a replacer function that replaces import statements for pure CSS
 * chunks with block comments of the same length, preserving source map offsets.
 */
export function getEmptyChunkReplacer(
  pureCssChunkNames: string[],
): (code: string) => string {
  const emptyChunkFiles = pureCssChunkNames
    .map((file) => escapeRegex(path.basename(file)))
    .join('|')

  const emptyChunkRE = new RegExp(
    String.raw`\bimport\s*["'][^"']*(?:${emptyChunkFiles})["'];`,
    'g',
  )

  return (code: string) =>
    code.replace(emptyChunkRE, (m) => {
      return `/* empty css ${''.padEnd(m.length - 15)}*/`
    })
}

function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function isEmptyChunkCode(code: string): boolean {
  return !code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\bexport\s*\{\s*\};?/g, '')
    .replace(/\bimport\s*["'][^"']*["'];?/g, '')
    .trim()
}
