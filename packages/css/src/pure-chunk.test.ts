import { parseSync } from 'rolldown/utils'
import { describe, expect, test } from 'vitest'
import { getEmptyChunkReplacer } from './pure-chunk.ts'

const replace = getEmptyChunkReplacer(['assets/card.cjs'], 'index.cjs')

function parseable(code: string): string {
  const parsed = parseSync('candidate.cjs', code)
  expect(parsed.errors).toEqual([])
  return code
}

describe('getEmptyChunkReplacer', () => {
  test('replaces a relative CJS side-effect require with equal length', () => {
    const code = "require('./assets/card.cjs');"
    const result = replace(code)
    expect(result).toHaveLength(code.length)
    expect(result).toContain('empty css')
    parseable(result)
  })

  test('preserves unrelated calls, lookalikes, and non-relative paths', () => {
    const code = [
      "x=require('./assets/card.cjs');",
      "fn(require('./assets/card.cjs'));",
      "(() => { require('./assets/card.cjs') })();",
      "({ require: fn }).require('./assets/card.cjs');",
      "function local(require) { require('./assets/card.cjs') }",
      "require('./assets/card.cjs'),exports.x=1;",
      "require('assets/card.cjs');",
      "require('./other/card.cjs');",
      'const text="require(\'./assets/card.cjs\')";',
      String.raw`const pattern=/require\(['"]\.\/assets\/card\.cjs['"]\)/;`,
      "/* require('./assets/card.cjs'); */",
    ].join('')
    const result = replace(code)
    expect(result).toHaveLength(code.length)
    expect(result).toContain("x=require('./assets/card.cjs');")
    expect(result).toContain("fn(require('./assets/card.cjs'));")
    expect(result).toContain("(() => { require('./assets/card.cjs') })();")
    expect(result).toContain("({ require: fn }).require('./assets/card.cjs');")
    expect(result).toContain(
      "function local(require) { require('./assets/card.cjs') }",
    )
    expect(result).toContain("require('assets/card.cjs');")
    expect(result).toContain("require('./other/card.cjs');")
    expect(result).toMatch(/const text="require\(.*card\.cjs.*\)";/)
    const sequenceCall = "require('./assets/card.cjs')"
    const sequenceStart = code.indexOf(`${sequenceCall},`)
    expect(
      result.slice(sequenceStart, sequenceStart + sequenceCall.length),
    ).toBe(`void 0${''.padEnd(sequenceCall.length - 6)}`)
    parseable(result)
  })

  test('keeps offsets with Unicode before a minified sequence', () => {
    const code = "const π='é';require('./assets/card.cjs'),exports.x=1;"
    const result = replace(code)
    expect(result).toHaveLength(code.length)
    expect(result).toContain('void 0')
    expect(result.startsWith("const π='é';")).toBe(true)
    expect(result.endsWith('exports.x=1;')).toBe(true)
    parseable(result)
  })
  test('keeps short replacements the same length', () => {
    const shortReplace = getEmptyChunkReplacer(['a'], 'index.cjs')
    const code = "require('./a');"
    const result = shortReplace(code)
    expect(result).toHaveLength(code.length)
    expect(result).toContain('void 0')
    parseable(result)
  })
})
