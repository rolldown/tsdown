import path from 'node:path'
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

  test('object entry', async (context) => {
    const files = {
      'src/index.ts': `export { sub } from "./sub";`,
      'src/sub.ts': `export const sub = "Hello, World!" as const`,
    }
    await testBuild({
      context,
      files,
      options: {
        entry: {
          index: 'src/index.ts',
        },
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
        root: 'src',
        unbundle: true,
      },
    })

    expect(outputFiles).toContain('utils/bar.mjs')
  })

  test('alias resolved in dts with unbundle', async (context) => {
    const files = {
      'src/index.ts': `export { getFoo } from './apis/getFoo.ts'`,
      'src/apis/getFoo.ts': `
        import type { DefaultHeaders } from '~src/types'
        export const getFoo = (params: DefaultHeaders) => fetch('/foo')
      `,
      'src/types.ts': `export interface DefaultHeaders { authorization: string }`,
    }
    const { fileMap } = await testBuild({
      context,
      files,
      options: (cwd) => ({
        entry: ['src/**/*.ts'],
        unbundle: true,
        dts: true,
        alias: {
          '~src': path.resolve(cwd, 'src'),
        },
      }),
    })

    const dtsFoo = fileMap['apis/getFoo.d.mts'] ?? fileMap['apis/getFoo.d.ts']
    expect(dtsFoo).toBeDefined()
    expect(dtsFoo).not.toContain('~src')
    expect(dtsFoo).toMatch(/from ['"]\.\.\/types(?:\.m?[jt]s)?['"]/)
  })
  
  test('with shims', async (context) => {
    const files = {
      'src/mod-a.ts': `export * from './shared.ts'`,
      'src/mod-b.ts': `export * from './shared.ts'`,
      'src/shared.ts': `export const chunk = [__dirname, __filename]`,
    }
    const { snapshot } = await testBuild({
      context,
      files,
      options: {
        entry: ['src/mod-a.ts', 'src/mod-b.ts'],
        shims: true,
        unbundle: true,
        minify: true,
      },
      prettier: true,
    })

    expect(snapshot).not.contain('__dirname')
    expect(snapshot).not.contain('__filename')
  })
})
