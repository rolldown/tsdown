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
  test('returns empty string for no paths', () => {
    expect(lowestCommonAncestor()).toBe('')
  })

  test('returns dirname for single path', () => {
    expect(lowestCommonAncestor('/foo/bar/baz.ts')).toBe('/foo/bar')
  })

  test('finds common ancestor of sibling files', () => {
    expect(lowestCommonAncestor('/src/a.ts', '/src/b.ts')).toBe('/src')
  })

  test('finds common ancestor of nested paths', () => {
    expect(lowestCommonAncestor('/src/utils/a.ts', '/src/config/b.ts')).toBe(
      '/src',
    )
  })

  test('handles paths with no common ancestor beyond root', () => {
    expect(lowestCommonAncestor('/foo/a.ts', '/bar/b.ts')).toBe('/')
  })

  test('handles multiple paths', () => {
    expect(
      lowestCommonAncestor(
        '/project/src/a.ts',
        '/project/src/b.ts',
        '/project/src/c.ts',
      ),
    ).toBe('/project/src')
  })

  test('handles paths at different depths', () => {
    expect(
      lowestCommonAncestor('/project/src/a.ts', '/project/lib/deep/b.ts'),
    ).toBe('/project')
  })
})

describe('stripExtname', () => {
  test('strips .ts extension', () => {
    expect(stripExtname('index.ts')).toBe('index')
  })

  test('strips .js extension', () => {
    expect(stripExtname('file.js')).toBe('file')
  })

  test('strips only last extension', () => {
    expect(stripExtname('file.test.ts')).toBe('file.test')
  })

  test('returns path unchanged if no extension', () => {
    expect(stripExtname('Makefile')).toBe('Makefile')
  })

  test('handles path with directory', () => {
    expect(stripExtname('src/utils/index.ts')).toBe('src/utils/index')
  })

  test('handles dotfile', () => {
    expect(stripExtname('.gitignore')).toBe('.gitignore')
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
