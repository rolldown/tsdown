import path from 'node:path'
import { parseSync } from 'rolldown/utils'
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
      chunk.code = getEmptyChunkReplacer(
        pureCssChunkNames,
        chunk.fileName,
      )(chunk.code)
    }
  }

  for (const fileName of pureCssChunkNames) {
    delete bundle[fileName]
    delete bundle[`${fileName}.map`]
  }
}

/**
 * Create a replacer function that removes pure CSS imports and side-effect requires
 * with same-length replacements, preserving source map offsets.
 */
export function getEmptyChunkReplacer(
  pureCssChunkNames: string[],
  chunkFileName = '',
): (code: string) => string {
  const emptyChunkFiles = pureCssChunkNames
    .map((file) => escapeRegex(path.basename(file)))
    .join('|')
  const emptyChunkPaths = new Set(
    pureCssChunkNames.map((file) =>
      path.posix.normalize(
        path.posix.relative(path.posix.dirname(chunkFileName), file),
      ),
    ),
  )

  const emptyChunkRE = new RegExp(
    String.raw`\bimport\s*["'][^"']*(?:${emptyChunkFiles})["'];`,
    'g',
  )

  return (code: string) => {
    const withoutImports = code.replace(emptyChunkRE, (m) => {
      return `/* empty css ${''.padEnd(m.length - 15)}*/`
    })
    return replaceEmptyCssRequires(withoutImports, emptyChunkPaths)
  }
}

function replaceEmptyCssRequires(
  code: string,
  emptyChunkPaths: Set<string>,
): string {
  const ast = parseSync('chunk.js', code)
  if (ast.errors?.length) return code
  const replacements: Array<{ start: number; end: number; sequence: boolean }> =
    []
  type AstNode = { type?: string; [key: string]: unknown }

  function visitSequence(node: AstNode, statement: AstNode): void {
    if (node.type === 'SequenceExpression') {
      for (const expression of node.expressions as AstNode[])
        visitSequence(expression, statement)
      return
    }
    if (node.type !== 'CallExpression') return
    const callee = node.callee as AstNode | undefined
    const args = Reflect.get(node, 'arguments')
    const argument = Array.isArray(args)
      ? (args[0] as AstNode | undefined)
      : undefined
    if (
      callee?.type !== 'Identifier' ||
      callee.name !== 'require' ||
      !Array.isArray(args) ||
      args.length !== 1 ||
      (argument?.type !== 'Literal' && argument?.type !== 'StringLiteral') ||
      typeof argument.value !== 'string' ||
      (!argument.value.startsWith('./') && !argument.value.startsWith('../')) ||
      !emptyChunkPaths.has(path.posix.normalize(argument.value)) ||
      typeof node.start !== 'number' ||
      typeof node.end !== 'number'
    )
      return
    replacements.push({
      start: node.start,
      end: node.end,
      sequence:
        (statement.expression as AstNode | undefined)?.type ===
        'SequenceExpression',
    })
  }

  for (const statement of ast.program.body as unknown as AstNode[]) {
    if (statement.type === 'ExpressionStatement') {
      visitSequence(statement.expression as AstNode, statement)
    }
  }
  let result = code
  for (const { start, end, sequence } of replacements.toSorted(
    (a, b) => b.start - a.start,
  )) {
    const length = end - start
    const replacement =
      sequence || length < 15
        ? 'void 0'.padEnd(length)
        : '/* empty css */'.padEnd(length, ' ')
    result = result.slice(0, start) + replacement + result.slice(end)
  }
  return result
}
function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function isEmptyChunkCode(code: string): boolean {
  return !code
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/[^\n]*/g, '')
    .replaceAll(/\bexport\s*\{\s*\};?/g, '')
    .replaceAll(/\bimport\s*["'][^"']*["'];?/g, '')
    .trim()
}
