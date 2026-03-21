import { describe, expect, it } from 'vitest'
import { getPackageName, getTypesPackageName } from './deps.ts'

describe('getPackageName', () => {
  it('returns the package root for deep imports', () => {
    expect(getPackageName('markdown-it/lib/token.mjs')).toBe('markdown-it')
  })

  it('returns the full scoped package name for deep imports', () => {
    expect(getPackageName('@scope/pkg/subpath')).toBe('@scope/pkg')
  })
})

describe('getTypesPackageName', () => {
  it('maps deep imports to the root DefinitelyTyped package', () => {
    expect(getTypesPackageName('markdown-it/lib/token.mjs')).toBe(
      '@types/markdown-it',
    )
  })

  it('maps deep imports from scoped packages to the scoped DefinitelyTyped package', () => {
    expect(getTypesPackageName('@scope/pkg/subpath')).toBe(
      '@types/scope__pkg',
    )
  })
})
