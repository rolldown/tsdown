import { RE_DTS } from 'rolldown-plugin-dts/filename'
import type { Plugin } from 'rolldown'

const VALUE_DECLARATION_PATTERNS = [
  /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\b/gm,
  /^\s*(?:export\s+)?(?:declare\s+)?(?:const|let|var|class|enum|namespace)\s+([A-Za-z_$][\w$]*)\b/gm,
]

const EXPORT_CLAUSE_RE =
  /export\s+(type\s+)?\{([^}]*)\}(\s*from\s*['"][^'"]+['"])?/g

const TYPE_SPECIFIER_RE =
  /(^|,)(\s*)type\s+([A-Za-z_$][\w$]*)(\s+as\s+[A-Za-z_$][\w$]*)?(\s*)(?=,|$)/g

export function fixDtsTypeOnlyNamedExports(code: string): string {
  const valueNames = collectValueDeclarationNames(code)
  if (valueNames.size === 0) return code

  return code.replaceAll(
    EXPORT_CLAUSE_RE,
    (
      full,
      exportTypeKeyword: string | undefined,
      specifiers: string,
      sourceClause: string | undefined,
    ) => {
      // `export type { ... }` can only export types.
      if (exportTypeKeyword) return full

      let changed = false
      const updatedSpecifiers = specifiers.replaceAll(
        TYPE_SPECIFIER_RE,
        (
          match: string,
          prefix: string,
          leading: string,
          localName: string,
          asClause: string | undefined,
          trailing: string,
        ) => {
          if (!valueNames.has(localName)) return match
          changed = true
          return `${prefix}${leading}${localName}${asClause || ''}${trailing}`
        },
      )

      if (!changed) return full
      return `export {${updatedSpecifiers}}${sourceClause || ''}`
    },
  )
}

export function DtsExportKindPlugin(): Plugin {
  return {
    name: 'tsdown:dts-export-kind',
    renderChunk(code, chunk) {
      if (!RE_DTS.test(chunk.fileName) || !code.includes('type ')) {
        return null
      }
      const fixedCode = fixDtsTypeOnlyNamedExports(code)
      if (fixedCode === code) return null
      return {
        code: fixedCode,
        map: null,
      }
    },
  }
}

function collectValueDeclarationNames(code: string): Set<string> {
  const valueNames = new Set<string>()
  for (const pattern of VALUE_DECLARATION_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    match = pattern.exec(code)
    while (match) {
      valueNames.add(match[1])
      match = pattern.exec(code)
    }
  }
  return valueNames
}
