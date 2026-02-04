import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'tinyexec'
import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('@types/* externalization', () => {
  const mockJsonSchemaTypes = `
    export interface JSONSchema7 {
      type?: string;
      properties?: Record<string, JSONSchema7>;
    }
  `

  test('externalizes imports when @types/{id} is a peer dependency', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `
          import type { JSONSchema7 } from 'json-schema';
          export type MySchema = JSONSchema7;
        `,
        'node_modules/@types/json-schema/index.d.ts': mockJsonSchemaTypes,
        'node_modules/@types/json-schema/package.json': JSON.stringify({
          name: '@types/json-schema',
          version: '7.0.0',
          types: 'index.d.ts',
        }),
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          peerDependencies: {
            '@types/json-schema': '^7.0.0',
          },
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            moduleResolution: 'bundler',
            strict: true,
          },
        }),
      },
      options: {
        entry: 'index.ts',
        dts: { emitDtsOnly: true },
        tsconfig: 'tsconfig.json',
      },
    })

    const dtsContent = fileMap['index.d.mts']
    expect(dtsContent).toContain('from "json-schema"')
  })

  test('externalizes imports when @types/{id} is a production dependency', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `
          import type { JSONSchema7 } from 'json-schema';
          export type MySchema = JSONSchema7;
        `,
        'node_modules/@types/json-schema/index.d.ts': mockJsonSchemaTypes,
        'node_modules/@types/json-schema/package.json': JSON.stringify({
          name: '@types/json-schema',
          version: '7.0.0',
          types: 'index.d.ts',
        }),
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          dependencies: {
            '@types/json-schema': '^7.0.0',
          },
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            moduleResolution: 'bundler',
            strict: true,
          },
        }),
      },
      options: {
        entry: 'index.ts',
        dts: { emitDtsOnly: true },
        tsconfig: 'tsconfig.json',
      },
    })

    const dtsContent = fileMap['index.d.mts']
    expect(dtsContent).toContain('from "json-schema"')
  })

  test('does NOT externalize @types/{id} when runtime package is a devDependency', async (context) => {
    // lodash has both a runtime package and @types/lodash
    const mockLodashTypes = `
      export function debounce<T extends (...args: any) => any>(func: T, wait?: number): T;
    `

    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `
          import type { debounce } from 'lodash';
          export type Debounce = typeof debounce;
        `,
        'node_modules/@types/lodash/index.d.ts': mockLodashTypes,
        'node_modules/@types/lodash/package.json': JSON.stringify({
          name: '@types/lodash',
          version: '4.14.0',
          types: 'index.d.ts',
        }),
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          devDependencies: {
            lodash: '^4.17.0',
          },
          peerDependencies: {
            '@types/lodash': '^4.14.0',
          },
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            moduleResolution: 'bundler',
            strict: true,
          },
        }),
      },
      options: {
        entry: 'index.ts',
        dts: { emitDtsOnly: true },
        tsconfig: 'tsconfig.json',
      },
    })

    const dtsContent = fileMap['index.d.mts']
    expect(dtsContent).not.toContain('from "lodash"')
  })
})

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
