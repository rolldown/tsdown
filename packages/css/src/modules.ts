import type { CSSModulesLocalsConvention } from './options.ts'
import type { CSSModuleExports, Rule, StyleSheet } from 'lightningcss'

function canDeduplicateRule(rule: Rule): boolean {
  switch (rule.type) {
    case 'style':
    case 'media':
    case 'supports':
    case 'container':
    case 'scope':
    case 'starting-style':
      return rule.value.rules?.every(canDeduplicateRule) ?? true
    case 'keyframes':
      return true
    default:
      return false
  }
}

export function deduplicateCssModuleRules(stylesheet: StyleSheet): StyleSheet {
  const seen = new Set<string>()
  const rules: Rule[] = []
  for (const rule of stylesheet.rules.toReversed()) {
    // Keep ordering-sensitive at-rules such as @layer, including nested ones.
    if (canDeduplicateRule(rule)) {
      const key = JSON.stringify(rule, (name, value) =>
        name === 'loc' ? undefined : value,
      )
      if (seen.has(key)) continue
      seen.add(key)
    }
    rules.push(rule)
  }
  // Keep the last occurrence so intervening overrides retain their priority.
  stylesheet.rules = rules.toReversed()
  return stylesheet
}

export function modulesToEsm(modules: Record<string, string>): string {
  const lines: string[] = []
  let index = 0
  for (const [key, value] of Object.entries(modules)) {
    if (key === 'default') {
      continue
    }
    const binding = `_key${index++}`
    lines.push(
      `const ${binding} = ${JSON.stringify(value)};`,
      `export { ${binding} as ${JSON.stringify(key)} };`,
    )
  }
  lines.push(`export default ${JSON.stringify(modules)};`)
  return lines.join('\n')
}

function dashToCamel(str: string): string {
  return str.replaceAll(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

export function applyLocalsConvention(
  modules: Record<string, string>,
  convention: CSSModulesLocalsConvention,
  inputFile: string,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(modules)) {
    if (typeof convention === 'function') {
      result[convention(key, value, inputFile)] = value
      continue
    }

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
