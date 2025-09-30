import { exec } from 'tinyexec'
import { describe, expect, test } from 'vitest'
import { testBuild } from './utils'

describe('issues', () => {
  test('#61', async (context) => {
    await testBuild({
      context,
      files: {
        'index.ts': `
      export * as debug from "debug"
      export * as foo from "~/foo"
      export * as bar from './bar'`,
        'src/foo.ts': `export const foo = 1`,
        'bar.ts': `export const bar = 2`,
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            paths: { '~/*': ['src/*'] },
          },
        }),
      },
      options: {
        external: ['hono/compress', 'hono', 'hono/pretty-json'],
        skipNodeModulesBundle: true,
        target: 'es2022',
        platform: 'node',
      },
    })
  })

  test('#206', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      fixture: 'issue-206',
      cwd: 'packages/pkg2',
      options: {
        entry: 'src/index.ts',
        outDir: 'dist',
        dts: true,
      },
      beforeBuild: async () => {
        await exec('pnpm', ['install', '--prefer-offline'], {
          nodeOptions: {
            stdio: ['ignore', 'ignore', 'inherit'],
          },
        })
      },
    })
    expect(outputFiles.toSorted()).toEqual(['index.d.ts', 'index.js'])
  })

  test.fails('#216', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'foo.css': `.foo { color: red; }`,
        'bar.css': `@import './foo.css'; .bar { color: blue; }`,
      },
      options: {
        entry: ['foo.css', 'bar.css'],
      },
    })
    expect(outputFiles).toContain('bar.css')
    expect(outputFiles).toContain('foo.css')
  })

  test('#221', async (context) => {
    await testBuild({
      context,
      files: {
        'index.ts': `export { versions } from 'node:process';`,
      },
      options: {
        removeNodeProtocol: true,
        skipNodeModulesBundle: true,
      },
    })
  })

  test('#286', async (context) => {
    await testBuild({
      context,
      files: {
        'src/dom/dom.ts': `export const dom = 1`,
        'src/node/node.ts': `export const node = 2`,
        'tsconfig.json': JSON.stringify({
          references: [
            { path: './tsconfig.node.json' },
            { path: './tsconfig.dom.json' },
          ],
          include: [],
        }),
        'tsconfig.node.json': JSON.stringify({
          compilerOptions: {
            outDir: 'temp/tsc/node',
            composite: true,
          },
          include: ['src/node/**/*.ts'],
        }),
        'tsconfig.dom.json': JSON.stringify({
          compilerOptions: {
            outDir: 'temp/tsc/dom',
            composite: true,
          },
          include: ['src/dom/**/*.ts'],
        }),
      },
      options: {
        entry: ['src/dom/dom.ts', 'src/node/node.ts'],
        dts: {
          build: true,
        },
      },
    })
  })
})
