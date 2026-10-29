import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writeFixtures } from '../../tests/utils.ts'
import {
  fsCopy,
  fsExists,
  fsRemove,
  fsStat,
  lowestCommonAncestor,
  stripExtname,
} from './fs.ts'

describe('lowestCommonAncestor', () => {
  test.each<[string, string[], string]>([
    ['returns empty string for no paths', [], ''],
    [
      'returns dirname for single path',
      ['/foo/bar/baz.ts'],
      path.dirname('/foo/bar/baz.ts'),
    ],
    [
      'finds common ancestor of sibling files',
      ['/src/a.ts', '/src/b.ts'],
      path.normalize('/src'),
    ],
    [
      'finds common ancestor of nested paths',
      ['/src/utils/a.ts', '/src/config/b.ts'],
      path.normalize('/src'),
    ],
    [
      'handles paths with no common ancestor beyond root',
      ['/foo/a.ts', '/bar/b.ts'],
      path.normalize('/'),
    ],
    [
      'handles multiple paths',
      ['/project/src/a.ts', '/project/src/b.ts', '/project/src/c.ts'],
      path.normalize('/project/src'),
    ],
    [
      'handles paths at different depths',
      ['/project/src/a.ts', '/project/lib/deep/b.ts'],
      path.normalize('/project'),
    ],
  ])('%s', (_, paths, expected) => {
    expect(lowestCommonAncestor(...paths)).toBe(expected)
  })
})

describe('stripExtname', () => {
  test.each([
    ['strips .ts extension', 'index.ts', 'index'],
    ['strips .js extension', 'file.js', 'file'],
    ['strips only last extension', 'file.test.ts', 'file.test'],
    ['returns path unchanged if no extension', 'Makefile', 'Makefile'],
    ['handles path with directory', 'src/utils/index.ts', 'src/utils/index'],
    ['handles dotfile', '.gitignore', '.gitignore'],
  ])('%s', (_, input, expected) => {
    expect(stripExtname(input)).toBe(expected)
  })
})

describe('fsExists', () => {
  test('returns true for existing file', async (context) => {
    const { testDir } = await writeFixtures(context, { 'test.txt': 'hello' })
    expect(await fsExists(path.join(testDir, 'test.txt'))).toBe(true)
  })

  test('returns false for non-existing file', async (context) => {
    const { testDir } = await writeFixtures(context, { 'test.txt': '' })
    expect(await fsExists(path.join(testDir, 'nope.txt'))).toBe(false)
  })
})

describe('fsStat', () => {
  test('returns stats for existing file', async (context) => {
    const { testDir } = await writeFixtures(context, { 'test.txt': 'hello' })
    const stats = await fsStat(path.join(testDir, 'test.txt'))
    expect(stats).not.toBeNull()
    expect(stats!.isFile()).toBe(true)
  })

  test('returns null for non-existing file', async (context) => {
    const { testDir } = await writeFixtures(context, { 'test.txt': '' })
    const stats = await fsStat(path.join(testDir, 'nope.txt'))
    expect(stats).toBeNull()
  })

  test('returns stats for directory', async (context) => {
    const { testDir } = await writeFixtures(context, { 'sub/test.txt': '' })
    const stats = await fsStat(path.join(testDir, 'sub'))
    expect(stats).not.toBeNull()
    expect(stats!.isDirectory()).toBe(true)
  })
})

describe('fsRemove', () => {
  test('removes existing file', async (context) => {
    const { testDir } = await writeFixtures(context, { 'test.txt': 'hello' })
    const filePath = path.join(testDir, 'test.txt')
    expect(await fsExists(filePath)).toBe(true)
    await fsRemove(filePath)
    expect(await fsExists(filePath)).toBe(false)
  })

  test('removes directory recursively', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'sub/a.txt': 'a',
      'sub/b.txt': 'b',
    })
    const dirPath = path.join(testDir, 'sub')
    expect(await fsExists(dirPath)).toBe(true)
    await fsRemove(dirPath)
    expect(await fsExists(dirPath)).toBe(false)
  })

  test('does not throw for non-existing path', async (context) => {
    const { testDir } = await writeFixtures(context, { 'test.txt': '' })
    await expect(
      fsRemove(path.join(testDir, 'nonexistent')),
    ).resolves.toBeUndefined()
  })
})

describe('fsCopy', () => {
  test('copies file to new location', async (context) => {
    const { testDir } = await writeFixtures(context, { 'src.txt': 'content' })
    const src = path.join(testDir, 'src.txt')
    const dest = path.join(testDir, 'dest.txt')
    await fsCopy(src, dest)
    expect(await fsExists(dest)).toBe(true)
  })

  test('copies directory recursively', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/a.txt': 'a',
      'src/nested/b.txt': 'b',
    })
    const destDir = path.join(testDir, 'dest')
    await mkdir(destDir, { recursive: true })
    await fsCopy(path.join(testDir, 'src'), destDir)
    expect(await fsExists(path.join(destDir, 'a.txt'))).toBe(true)
  })
})
