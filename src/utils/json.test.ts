import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writeFixtures } from '../../tests/utils.ts'
import { writeJsonFile } from './json.ts'

describe('writeJsonFile', () => {
  test('creates a new file when it does not exist', async (context) => {
    const { testDir } = await writeFixtures(context, { 'placeholder.txt': '' })
    const filePath = path.join(testDir, 'new.json')
    writeJsonFile(filePath, { foo: 'bar' })
    expect(readFileSync(filePath, 'utf8')).toBe('{\n  "foo": "bar"\n}')
  })

  test('does not rewrite when keys are reordered but content is deeply equal', async (context) => {
    const original = '{"b":1,\n"a":2}'
    const { testDir } = await writeFixtures(context, { 'pkg.json': original })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { a: 2, b: 1 })
    expect(readFileSync(filePath, 'utf8')).toBe(original)
  })

  test('does not rewrite when content is identical', async (context) => {
    const original = '{\t"foo":"bar"\n  }'
    const { testDir } = await writeFixtures(context, { 'pkg.json': original })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { foo: 'bar' })
    expect(readFileSync(filePath, 'utf8')).toBe(original)
  })

  test('updates the file when content changes', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'pkg.json': '{\n  "foo": "bar"\n}',
    })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { foo: 'baz' })
    expect(readFileSync(filePath, 'utf8')).toBe('{\n  "foo": "baz"\n}')
  })

  test('preserves tab indentation', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'pkg.json': '{\n\t"foo": "bar"\n}',
    })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { foo: 'baz' })
    expect(readFileSync(filePath, 'utf8')).toBe('{\n\t"foo": "baz"\n}')
  })

  test('preserves 4-space indentation', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'pkg.json': '{\n    "foo": "bar"\n}',
    })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { foo: 'baz' })
    expect(readFileSync(filePath, 'utf8')).toBe('{\n    "foo": "baz"\n}')
  })

  test('preserves CRLF line endings', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'pkg.json': '{\r\n  "foo": "bar"\r\n}',
    })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { foo: 'baz' })
    expect(readFileSync(filePath, 'utf8')).toBe('{\r\n  "foo": "baz"\r\n}')
  })

  test('preserves trailing newline', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'pkg.json': '{\n  "foo": "bar"\n}\n',
    })
    const filePath = path.join(testDir, 'pkg.json')
    writeJsonFile(filePath, { foo: 'baz' })
    expect(readFileSync(filePath, 'utf8')).toBe('{\n  "foo": "baz"\n}\n')
  })
})
