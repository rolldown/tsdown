import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import { toObjectEntry } from './entry.ts'

const TEST_ROOT = path.join(process.cwd(), '.temp', 'entry-test')
let tempCounter = 0

async function createTempDir(): Promise<string> {
  const dir = path.join(TEST_ROOT, `case-${tempCounter++}`)
  await mkdir(dir, { recursive: true })
  return dir
}

describe('toObjectEntry', () => {
  beforeAll(async () => {
    // Clean up test root directory before running tests
    await rm(TEST_ROOT, { recursive: true, force: true })
  })

  afterEach(async () => {
    // Clean up entire test root after each test
    await rm(TEST_ROOT, { recursive: true, force: true })
    tempCounter = 0
  })
  test('string entry', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'index.ts'), '')

    const result = await toObjectEntry('index.ts', tempDir)
    expect(result).toEqual({
      index: path.join(tempDir, 'index.ts'),
    })
  })

  test('array entry', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'foo.ts'), '')
    await writeFile(path.join(tempDir, 'bar.ts'), '')

    const result = await toObjectEntry(['foo.ts', 'bar.ts'], tempDir)
    expect(result).toEqual({
      foo: path.join(tempDir, 'foo.ts'),
      bar: path.join(tempDir, 'bar.ts'),
    })
  })

  test('object entry', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'index.ts'), '')

    const result = await toObjectEntry({ main: 'index.ts' }, tempDir)
    expect(result).toEqual({
      main: path.join(tempDir, 'index.ts'),
    })
  })

  test('glob pattern', async () => {
    const tempDir = await createTempDir()
    await mkdir(path.join(tempDir, 'src'), { recursive: true })
    await writeFile(path.join(tempDir, 'src', 'foo.ts'), '')
    await writeFile(path.join(tempDir, 'src', 'bar.ts'), '')

    const result = await toObjectEntry(['src/*.ts'], tempDir)
    expect(result).toEqual({
      foo: path.join(tempDir, 'src', 'foo.ts'),
      bar: path.join(tempDir, 'src', 'bar.ts'),
    })
  })

  test('infer extension with .ts', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'index.ts'), '')

    const result = await toObjectEntry('index', tempDir)
    expect(result).toEqual({
      index: path.join(tempDir, 'index.ts'),
    })
  })

  test('infer extension with .js', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'index.js'), '')

    const result = await toObjectEntry('index', tempDir)
    expect(result).toEqual({
      index: path.join(tempDir, 'index.js'),
    })
  })

  test('infer extension priority', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'index.ts'), '')
    await writeFile(path.join(tempDir, 'index.js'), '')

    const result = await toObjectEntry('index', tempDir)
    // Should prefer .ts over .js based on DEFAULT_EXTENSIONS order
    expect(result).toEqual({
      index: path.join(tempDir, 'index.ts'),
    })
  })

  test('infer extension in object entry', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'foo.ts'), '')
    await writeFile(path.join(tempDir, 'bar.tsx'), '')

    const result = await toObjectEntry({ foo: 'foo', bar: 'bar' }, tempDir)
    expect(result).toEqual({
      foo: path.join(tempDir, 'foo.ts'),
      bar: path.join(tempDir, 'bar.tsx'),
    })
  })

  test('infer extension in array entry', async () => {
    const tempDir = await createTempDir()
    await writeFile(path.join(tempDir, 'foo.ts'), '')
    await writeFile(path.join(tempDir, 'bar.tsx'), '')

    const result = await toObjectEntry(['foo', 'bar'], tempDir)
    expect(result).toEqual({
      foo: path.join(tempDir, 'foo.ts'),
      bar: path.join(tempDir, 'bar.tsx'),
    })
  })

  test('fallback to original path when inference fails', async () => {
    const tempDir = await createTempDir()

    const result = await toObjectEntry({ main: 'nonexistent' }, tempDir)
    expect(result).toEqual({
      main: path.join(tempDir, 'nonexistent'),
    })
  })

  test('nested directory structure', async () => {
    const tempDir = await createTempDir()
    await mkdir(path.join(tempDir, 'src', 'utils'), { recursive: true })
    await writeFile(path.join(tempDir, 'src', 'index.ts'), '')
    await writeFile(path.join(tempDir, 'src', 'utils', 'helper.ts'), '')

    const result = await toObjectEntry(
      ['src/index.ts', 'src/utils/helper.ts'],
      tempDir,
    )
    expect(result).toEqual({
      index: path.join(tempDir, 'src', 'index.ts'),
      'utils/helper': path.join(tempDir, 'src', 'utils', 'helper.ts'),
    })
  })

  test('mixed glob and direct paths', async () => {
    const tempDir = await createTempDir()
    await mkdir(path.join(tempDir, 'src'), { recursive: true })
    await writeFile(path.join(tempDir, 'src', 'foo.ts'), '')
    await writeFile(path.join(tempDir, 'src', 'bar.ts'), '')
    await writeFile(path.join(tempDir, 'index.ts'), '')

    const result = await toObjectEntry(['index.ts', 'src/*.ts'], tempDir)
    expect(result).toEqual({
      index: path.join(tempDir, 'index.ts'),
      'src/foo': path.join(tempDir, 'src', 'foo.ts'),
      'src/bar': path.join(tempDir, 'src', 'bar.ts'),
    })
  })
})
