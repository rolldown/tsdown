import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'tinyexec'
import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

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
        deps: {
          neverBundle: ['hono/compress', 'hono', 'hono/pretty-json'],
          skipNodeModulesBundle: true,
        },
        target: 'es2022',
        platform: 'node',
        tsconfig: 'tsconfig.json',
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
    expect(outputFiles.toSorted()).toEqual(['index.d.mts', 'index.mjs'])
  })

  test('#216', async (context) => {
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
        deps: { skipNodeModulesBundle: true },
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
        tsconfig: 'tsconfig.json',
        dts: {
          build: true,
        },
      },
    })
  })

  test('#566', async (context) => {
    const { testDir } = await testBuild({
      context,
      files: {
        'src/index.browser.ts': `export const platform = 'browser'`,
        'src/index.node.ts': `export const platform = 'node'`,
        'tsdown.config.ts': `
          export default [
            {
              entry: './src/index.browser.ts',
              format: 'es',
              exports: true,
              hash: false,
              platform: 'browser',
            },
            {
              entry: './src/index.node.ts',
              format: 'cjs',
              exports: true,
              hash: false,
              platform: 'node',
            },
          ]
        `,
        'package.json': JSON.stringify({
          name: 'issue-566',
          version: '1.0.0',
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: { moduleResolution: 'bundler' },
        }),
      },
      options: {
        entry: undefined,
        config: 'tsdown.config.ts',
        dts: false,
      },
      expectPattern: '**/*.{js,cjs,d.mts}',
    })

    const pkg = JSON.parse(
      await readFile(path.join(testDir, 'package.json'), 'utf8'),
    )
    expect(pkg.main).toBe('./dist/index.node.cjs')
    expect(pkg.module).toBe('./dist/index.browser.mjs')
    expect(pkg.exports).toEqual({
      '.': {
        import: './dist/index.browser.mjs',
        require: './dist/index.node.cjs',
      },
      './package.json': './package.json',
    })
  })

  test('#772', async (context) => {
    const { fileMap, outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import { randomUUID } from 'node:crypto'\nimport { resolve } from 'node:path'\nexport const id = randomUUID()\nexport const dir = resolve('.')`,
        'crypto-polyfill.ts': `export function randomUUID() { return 'polyfill-uuid' }`,
        'path-polyfill.ts': `export function resolve(...args: string[]) { return args.join('/') }`,
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            paths: { crypto: ['./crypto-polyfill'] },
          },
        }),
      },
      options: {
        nodeProtocol: 'strip',
        alias: { path: './path-polyfill' },
        tsconfig: 'tsconfig.json',
      },
    })
    expect(outputFiles).toContain('index.mjs')
    expect(fileMap['index.mjs']).toContain('args.join')
    expect(fileMap['index.mjs']).not.toMatch(/from ['"]path['"]/)
    expect(fileMap['index.mjs']).toContain('polyfill-uuid')
    expect(fileMap['index.mjs']).not.toMatch(/from ['"]crypto['"]/)
  })

  test.fails('#668', async (context) => {
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'shared.css': `.class-shared { color: red; }`,
        'entry1.css': `@import './shared.css'; .class-entry1 { color: red; }`,
        'entry2.css': `@import './shared.css'; .class-entry2 { color: red; }`,
      },
      options: {
        entry: ['entry1.css', 'entry2.css'],
      },
    })
    expect(outputFiles).toContain('entry1.css')
    expect(outputFiles).toContain('entry2.css')
    expect(fileMap['entry1.css']).toContain('class-entry1')
    expect(fileMap['entry2.css']).toContain('class-entry2')
    expect(fileMap['entry1.css']).toContain('class-shared')
    expect(fileMap['entry2.css']).toContain('class-shared')
  })
})
