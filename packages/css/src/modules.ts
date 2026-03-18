import type { CSSModuleExports } from 'lightningcss'

const VALID_ID_RE = /^[$_a-z][$\w]*$/i
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words
const RESERVED_WORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'arguments',
  'as',
  'async',
  'eval',
  'from',
  'get',
  'of',
  'set',
  'let',
  'static',
  'yield',
  'await',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'enum',
  'abstract',
  'boolean',
  'byte',
  'char',
  'double',
  'final',
  'float',
  'goto',
  'int',
  'long',
  'native',
  'short',
  'synchronized',
  'throws',
  'transient',
  'volatile',
])

function canUseNamedExport(key: string): boolean {
  return VALID_ID_RE.test(key) && !RESERVED_WORDS.has(key)
}

export function modulesToEsm(modules: Record<string, string>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(modules)) {
    if (canUseNamedExport(key)) {
      lines.push(`export const ${key} = ${JSON.stringify(value)};`)
    }
  }
  lines.push(`export default ${JSON.stringify(modules)};`)
  return lines.join('\n')
}

function dashToCamel(str: string): string {
  return str.replaceAll(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

export function applyLocalsConvention(
  modules: Record<string, string>,
  convention: 'camelCase' | 'camelCaseOnly' | 'dashes' | 'dashesOnly',
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(modules)) {
    const camelized = dashToCamel(key)
    switch (convention) {
      case 'camelCase':
        result[key] = value
        if (camelized !== key) {
          result[camelized] = value
        }
        break
      case 'camelCaseOnly':
        result[camelized] = value
        break
      case 'dashes':
        result[key] = value
        if (key.includes('-')) {
          result[camelized] = value
        }
        break
      case 'dashesOnly':
        if (key.includes('-')) {
          result[camelized] = value
        } else {
          result[key] = value
        }
        break
    }
  }
  return result
}

export function extractLightningCssModuleExports(
  exports: CSSModuleExports,
): Record<string, string> {
  const modules: Record<string, string> = {}
  const sortedEntries = Object.entries(exports).toSorted(([a], [b]) =>
    a.localeCompare(b),
  )
  for (const [key, value] of sortedEntries) {
    let name = value.name
    for (const c of value.composes) {
      name += ` ${c.name}`
    }
    modules[key] = name
  }
  return modules
}
