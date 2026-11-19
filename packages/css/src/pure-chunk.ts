import path from 'node:path'
import { escapeRegex } from './utils.ts'
import type { CssStyles } from './post.ts'
import type { InternalModuleFormat, OutputAsset, OutputChunk } from 'rolldown'

/**
 * Find "pure CSS chunks" — JS chunks that exist only because they imported
 * CSS files. Following Vite's implementation.
 */
export function findPureCssChunks(
  bundle: Record<string, OutputChunk | OutputAsset>,
  styles: CssStyles,
): Set<string> {
  const chunks = Object.values(bundle).filter(
    (chunk) => chunk.type === 'chunk' && !chunk.exports.length,
  ) as OutputChunk[]
  const pureCssChunks = new Set<string>()

  // Strict: all modules in the chunk are CSS
  for (const chunk of chunks) {
    if (
      chunk.moduleIds.length &&
      chunk.moduleIds.every((id) => styles.has(id))
    ) {
      pureCssChunks.add(chunk.fileName)
    }
  }

  // Relaxed: a non-entry wrapper around CSS (e.g. a JS file whose only
  // purpose is `import './foo.css'`). Its JS modules render no code, and it
  // only imports pure CSS chunks; anything else may be a side effect.
  // Repeat until stable to catch wrappers of wrappers.
  let changed = true
  while (changed) {
    changed = false
    for (const chunk of chunks) {
      if (
        pureCssChunks.has(chunk.fileName) ||
        chunk.isEntry ||
        chunk.isDynamicEntry
      )
        continue
      if (
        (chunk.imports.length ||
          chunk.moduleIds.some((id) => styles.has(id))) &&
        chunk.imports.every((file) => pureCssChunks.has(file)) &&
        Object.values(chunk.modules).every((mod) => !mod.renderedLength)
      ) {
        pureCssChunks.add(chunk.fileName)
        changed = true
      }
    }
  }

  return pureCssChunks
}

/**
 * Remove pure CSS chunks and their imports from other chunks.
 */
export function removePureCssChunks(
  bundle: Record<string, OutputChunk | OutputAsset>,
  styles: CssStyles,
  outputFormat: InternalModuleFormat,
): void {
  const pureCssChunkNames = [...findPureCssChunks(bundle, styles)]

  if (!pureCssChunkNames.length) return

  const replaceEmptyChunk = getEmptyChunkReplacer(
    pureCssChunkNames,
    outputFormat,
  )

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
 * Create a replacer function that replaces import statements (ESM) or require
 * calls (CJS) for pure CSS chunks with block comments of the same length,
 * preserving source map offsets.
 */
export function getEmptyChunkReplacer(
  pureCssChunkNames: string[],
  outputFormat: InternalModuleFormat,
): (code: string) => string {
  const emptyChunkFiles = pureCssChunkNames
    .map((file) => escapeRegex(path.basename(file)))
    .join('|')

  // For CJS, a minifier may chain require calls with the comma operator. In
  // that case keep one comma if another require follows, or keep a semicolon
  // to terminate the chain.
  const emptyChunkRE = new RegExp(
    outputFormat === 'es'
      ? String.raw`\bimport\s*["'][^"']*(?:${emptyChunkFiles})["'];`
      : String.raw`(\b|,\s*)require\(\s*["'\`][^"'\`]*(?:${emptyChunkFiles})["'\`]\)(;|,)`,
    'g',
  )

  return (code: string) =>
    code.replace(emptyChunkRE, (m, p1: string, p2: string) => {
      if (outputFormat === 'es') {
        return `/* empty css ${''.padEnd(m.length - 15)}*/`
      }
      if (p2 === ';') {
        // Ends with `;`: move it to the front and drop the leading `,`
        return `${p2}/* empty css ${''.padEnd(m.length - 16)}*/`
      }
      // Ends with `,`: drop it but keep the leading `,` if any
      return `${p1}/* empty css ${''.padEnd(m.length - 15 - p1.length)}*/`
    })
}
