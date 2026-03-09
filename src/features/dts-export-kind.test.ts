import { describe, expect, test } from 'vitest'
import { fixDtsTypeOnlyNamedExports } from './dts-export-kind.ts'

describe('fixDtsTypeOnlyNamedExports', () => {
  test('converts incorrectly type-only specifiers for value declarations', () => {
    const code = `
declare function defineMcpToolRegister(name: string): void;
type StorageValue = string;
export { type defineMcpToolRegister as a, type StorageValue as c };
`

    const fixed = fixDtsTypeOnlyNamedExports(code)

    expect(fixed).toContain(
      'export { defineMcpToolRegister as a, type StorageValue as c };',
    )
  })

  test('keeps type-only exports for type declarations', () => {
    const code = `
type Foo = string;
interface Bar { value: string }
export { type Foo as a, type Bar as b };
`
    expect(fixDtsTypeOnlyNamedExports(code)).toBe(code)
  })

  test('does not rewrite `export type { ... }` statements', () => {
    const code = `
declare function foo(): void;
export type { type foo as a };
`
    expect(fixDtsTypeOnlyNamedExports(code)).toBe(code)
  })
})
