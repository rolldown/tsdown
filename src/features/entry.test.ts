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

  test('object entry with globs', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'index.ts': '',
      'src/foo.ts': '',
      'src/bar.ts': '',
      'test/test.ts': '',
      'nested/a/b/c.ts': '',
    })
    const result = await toObjectEntry(
      {
        '*.min': '*.ts',
        'lib/*': 'src/*.ts',
        test: 'test/test.ts',
        test2: 'test/*.ts',
        'nested/*': 'nested/**/*.ts',
      },
      testDir,
    )
    expect(result).toEqual({
      'index.min': path.join(testDir, 'index.ts'),
      'lib/foo': path.join(testDir, 'src/foo.ts'),
      'lib/bar': path.join(testDir, 'src/bar.ts'),
      test: 'test/test.ts',
      test2: 'test/*.ts',
      'nested/a/b/c': path.join(testDir, 'nested/a/b/c.ts'),
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

  // #660
  test('object entry with glob negation pattern', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/hooks/index.ts': '',
      'src/hooks/useAuth.ts': '',
      'src/hooks/useUser.ts': '',
    })
    const result = await toObjectEntry(
      {
        'hooks/*': ['src/hooks/*.ts', '!src/hooks/index.ts'],
      },
      testDir,
    )
    expect(result).toEqual({
      'hooks/useAuth': path.join(testDir, 'src/hooks/useAuth.ts'),
      'hooks/useUser': path.join(testDir, 'src/hooks/useUser.ts'),
    })
    expect(Object.keys(result)).not.toContain('hooks/index')
  })

  test('object entry with multiple negation patterns', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/utils/index.ts': '',
      'src/utils/internal.ts': '',
      'src/utils/helper.ts': '',
      'src/utils/format.ts': '',
    })
    const result = await toObjectEntry(
      {
        'utils/*': [
          'src/utils/*.ts',
          '!src/utils/index.ts',
          '!src/utils/internal.ts',
        ],
      },
      testDir,
    )
    expect(result).toEqual({
      'utils/helper': path.join(testDir, 'src/utils/helper.ts'),
      'utils/format': path.join(testDir, 'src/utils/format.ts'),
    })
  })

  test('object entry with array value for non-glob key', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/index.ts': '',
    })
    const result = await toObjectEntry(
      {
        main: ['src/index.ts', '!src/other.ts'],
      },
      testDir,
    )
    expect(result).toEqual({
      main: 'src/index.ts',
    })
  })

  test('object entry with multiple positive patterns should throw', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/hooks/useAuth.ts': '',
      'src/utils/helper.ts': '',
    })
    await expect(
      toObjectEntry(
        {
          'lib/*': ['src/hooks/*.ts', 'src/utils/*.ts'],
        },
        testDir,
      ),
    ).rejects.toThrow(/multiple positive patterns/)
  })

  test('object entry with no positive pattern should throw', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'src/hooks/useAuth.ts': '',
    })
    await expect(
      toObjectEntry(
        {
          'hooks/*': ['!src/hooks/index.ts'],
        },
        testDir,
      ),
    ).rejects.toThrow(/no positive pattern/)
  })
})
