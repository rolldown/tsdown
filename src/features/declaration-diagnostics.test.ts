import { describe, expect, it } from 'vitest'
import {
  addDeclarationDiagnosticHints,
  formatDevDependencyDeclarationHint,
  type DeclarationDiagnosticContext,
} from './declaration-diagnostics.ts'
import type { PackageJson } from 'pkg-types'
import type { RolldownError } from 'rolldown'

const hint = formatDevDependencyDeclarationHint('dev-only')

describe('addDeclarationDiagnosticHints', () => {
  it('adds devDependency hints to aggregate and child declaration errors', () => {
    const diagnostic = createRolldownError({
      code: 'MISSING_EXPORT',
      id: '/project/src/index.d.ts',
      exporter: '/project/node_modules/dev-only/index.d.ts',
    })
    const error = createBuildError(diagnostic)

    addDeclarationDiagnosticHints(error, createContext())

    expect(error.message).toContain(hint)
    expect(diagnostic.message).toContain(hint)
  })

  it('does not hint for production dependencies', () => {
    const error = createBuildError(
      createRolldownError({
        code: 'MISSING_EXPORT',
        id: '/project/src/index.d.ts',
        exporter: '/project/node_modules/dev-only/index.d.ts',
      }),
    )

    addDeclarationDiagnosticHints(
      error,
      createContext({
        dependencies: { 'dev-only': '^1.0.0' },
        devDependencies: { 'dev-only': '^1.0.0' },
      }),
    )

    expect(error.message).not.toContain(hint)
  })

  it('does not hint for runtime missing exports', () => {
    const error = createBuildError(
      createRolldownError({
        code: 'MISSING_EXPORT',
        id: '/project/src/index.js',
        exporter: '/project/node_modules/dev-only/index.js',
      }),
    )

    addDeclarationDiagnosticHints(error, createContext())

    expect(error.message).not.toContain(hint)
  })

  it('does not hint for unrelated declaration diagnostics', () => {
    const error = createBuildError(
      createRolldownError({
        code: 'OTHER_ERROR',
        id: '/project/src/index.d.ts',
        exporter: '/project/node_modules/dev-only/index.d.ts',
      }),
    )

    addDeclarationDiagnosticHints(error, createContext())

    expect(error.message).not.toContain(hint)
  })

  it('does not infer package names from unstructured import undefined diagnostics', () => {
    const error = createBuildError(
      createRolldownError({
        code: 'IMPORT_IS_UNDEFINED',
        id: '/project/src/index.d.ts',
      }),
    )

    addDeclarationDiagnosticHints(error, createContext())

    expect(error.message).not.toContain(hint)
  })
})

function createBuildError(...errors: Error[]): Error {
  return Object.assign(new Error('Build failed'), { errors })
}

function createRolldownError(
  options: Pick<RolldownError, 'code' | 'exporter' | 'id'>,
): Error {
  return Object.assign(new Error('Diagnostic failed'), options)
}

function createContext(pkg: PackageJson = defaultPkg()) {
  return { pkg } satisfies DeclarationDiagnosticContext
}

function defaultPkg(): PackageJson {
  return {
    name: 'test-pkg',
    version: '1.0.0',
    devDependencies: { 'dev-only': '^1.0.0' },
  }
}
