import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('unbundle', () => {
  test('basic', async (context) => {
    const files = {
      'src/index.ts': `
        export * from './foo.ts'
        export * from './utils/bar.ts'
      `,
      'src/foo.ts': `export const foo = 1`,
      'src/utils/bar.ts': `export const bar = 2`,
    }
    await testBuild({
      context,
      files,
      options: {
        entry: ['src/index.ts', 'src/foo.ts'],
        unbundle: true,
      },
    })
  })

  test('base dir', async (context) => {
    const files = {
      'src/index.ts': `
        export { version } from '../package.json'
        export * from './utils/bar.ts'
      `,
      'src/utils/bar.ts': `export const bar = 2`,
      'package.json': JSON.stringify({ version: '0.0.0' }),
    }
    await testBuild({
      context,
      files,
      options: {
        entry: ['src/index.ts'],
        unbundle: true,
      },
    })
  })

  test('preserve folder structure', async (context) => {
    const files = {
      'src/utils/bar.ts': `export const bar = 2`,
      'package.json': JSON.stringify({ version: '0.0.0' }),
    }
    const { outputFiles } = await testBuild({
      context,
      files,
      options: {
        entry: ['src/**/*'],
        unbundle: true,
      },
    })

    expect(outputFiles).toContain('utils/bar.mjs')
  })
})
