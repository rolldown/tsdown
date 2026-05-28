import { getDevDependencyOnlyName } from './deps.ts'
import type { PackageJson } from 'pkg-types'
import type { RolldownError } from 'rolldown'

const DECLARATION_DEPENDENCY_CODES = new Set(['MISSING_EXPORT'])
const RE_DTS_FILE = /\.d\.[cm]?ts$/

export interface DeclarationDiagnosticContext {
  pkg?: PackageJson
}

interface ErrorWithErrors extends Error {
  errors?: unknown[]
}

export function formatDevDependencyDeclarationHint(name: string): string {
  return `Hint: ${name} is listed in devDependencies only. Move it to dependencies or peerDependencies if it is needed by published declarations.`
}

export function addDeclarationDiagnosticHints(
  error: unknown,
  context: DeclarationDiagnosticContext,
): void {
  if (!(error instanceof Error)) return

  const hints = new Set<string>()
  for (const diagnostic of getDiagnostics(error)) {
    const hint = getDevDependencyDeclarationHint(diagnostic, context)
    if (!hint) continue
    appendHint(diagnostic, hint)
    hints.add(hint)
  }

  for (const hint of hints) {
    appendHint(error, hint)
  }
}

function getDiagnostics(error: Error): Error[] {
  const diagnostics = (error as ErrorWithErrors).errors
  if (!Array.isArray(diagnostics)) return [error]
  return diagnostics.filter((diagnostic): diagnostic is Error => {
    return diagnostic instanceof Error
  })
}

function getDevDependencyDeclarationHint(
  diagnostic: Error,
  context: DeclarationDiagnosticContext,
): string | undefined {
  const { code, exporter, id, loc } = diagnostic as RolldownError
  if (!code || !DECLARATION_DEPENDENCY_CODES.has(code) || !exporter) return
  if (!isDeclarationDiagnostic(id, exporter, loc?.file)) return

  const name = getDevDependencyOnlyName(context.pkg, exporter)
  return name ? formatDevDependencyDeclarationHint(name) : undefined
}

function appendHint(error: Error, hint: string): void {
  if (!error.message.includes(hint)) {
    error.message += `\n${hint}`
  }
}

function isDeclarationDiagnostic(...ids: Array<string | undefined>): boolean {
  return ids.some((id) => id && RE_DTS_FILE.test(id))
}
