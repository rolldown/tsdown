import type { CSSModuleExports } from 'lightningcss'

const VALID_ID_RE = /^[$_a-z][$\w]*$/i

export function modulesToEsm(modules: Record<string, string>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(modules)) {
    if (VALID_ID_RE.test(key)) {
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
