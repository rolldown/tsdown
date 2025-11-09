import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writeFixtures } from '../../tests/utils.ts'
import { toObjectEntry } from './entry.ts'

describe('toObjectEntry', () => {
  test('string entry', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'index.ts': '',
    })
    const result = await toObjectEntry('index.ts', testDir)
    expect(result).toEqual({
      index: 'index.ts',
    })
  })

  test('array entry', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'foo.ts': '',
      'bar.ts': '',
    })
    const result = await toObjectEntry(
      ['foo.ts', 'bar.ts', 'nonexistent'],
      testDir,
    )
    expect(result).toEqual({
      foo: 'foo.ts',
      bar: 'bar.ts',
      nonexistent: 'nonexistent',
    })
  })

  test('object entry', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'index.ts': '',
    })
    const result = await toObjectEntry(
      { main: 'index.ts', nonexistent: 'nonexistent' },
      testDir,
    )
    expect(result).toEqual({
      main: 'index.ts',
      nonexistent: 'nonexistent',
    })
  })

  test('glob pattern', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/foo.ts': '',
      'src/bar.ts': '',
    })
    const result = await toObjectEntry(['src/*.ts', 'nonexistent'], testDir)
    expect(result).not.include.keys('nonexistent')
    expect(result).toEqual({
      foo: path.join(testDir, 'src/foo.ts'),
      bar: path.join(testDir, 'src/bar.ts'),
    })
  })

  test('nested directory structure', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/index.ts': '',
      'src/utils/helper.ts': '',
    })
    const result = await toObjectEntry(
      ['src/index.ts', 'src/utils/helper.ts'],
      testDir,
    )
    expect(result).toEqual({
      index: 'src/index.ts',
      'utils/helper': 'src/utils/helper.ts',
    })
  })

  test('mixed glob and direct paths', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'index.ts': '',
      'src/foo.ts': '',
      'src/bar.ts': '',
    })
    const result = await toObjectEntry(['index.ts', 'src/*.ts'], testDir)
    expect(result).toEqual({
      index: path.join(testDir, 'index.ts'),
      'src/foo': path.join(testDir, 'src/foo.ts'),
      'src/bar': path.join(testDir, 'src/bar.ts'),
    })
  })
})
