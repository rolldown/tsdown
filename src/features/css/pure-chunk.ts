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

  for (const [fileName, chunk] of Object.entries(bundle)) {
    if (chunk.type !== 'chunk') continue
    if (chunk.isEntry) continue
    if (chunk.exports.length > 0) continue

    const moduleIds = Object.keys(chunk.modules)
    if (moduleIds.length === 0) continue
    const allCss = moduleIds.every((id) => styles.has(id))
    if (!allCss) continue

    pureCssChunkNames.push(fileName)
  }

  if (!pureCssChunkNames.length) return

  const replaceEmptyChunk = getEmptyChunkReplacer(pureCssChunkNames)

  for (const file of Object.keys(bundle)) {
    const chunk = bundle[file]
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
