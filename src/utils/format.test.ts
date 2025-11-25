import { describe, test } from 'vitest'
import { detectIndentation } from './format.ts'

describe('detectIndent', () => {
  test('two spaces', ({ expect }) => {
    expect(detectIndentation(stringifyJson(2))).toBe(2)
  })
  test('four spaces', ({ expect }) => {
    expect(detectIndentation(stringifyJson(4))).toBe(4)
  })
  test('tab', ({ expect }) => {
    expect(detectIndentation(stringifyJson('\t'))).toBe('\t')
  })
  test('empty', ({ expect }) => {
    expect(detectIndentation('')).toBe(2)
  })
  test('empty line', ({ expect }) => {
    expect(detectIndentation('{\n\n  "foo": 42 }')).toBe(2)
  })
})

function stringifyJson(indentation: string | number): string {
  const contents = JSON.stringify({ foo: 42 }, null, indentation)
  return contents
}
