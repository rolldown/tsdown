import path from 'node:path'
import { beforeEach, expect, test, vi } from 'vitest'
import { resolveOptions, type Options } from '../src/options'
import { fsRemove } from '../src/utils/fs'
import { chdir, getTestDir, testBuild, writeFixtures } from './utils'

beforeEach(async (context) => {
  const dir = getTestDir(context.task)
  await fsRemove(dir)
})

test('basic', async (context) => {
  const content = `console.log("Hello, world!")`
  const { snapshot } = await testBuild({
    context,
    files: {
      'index.ts': content,
    },
  })
  expect(snapshot).contain(content)
})

{
  const files = {
    'index.ts': "export { foo } from './foo'",
    'foo.ts': 'export const foo = 1',
  }
  test('esm import', async (context) => {
    await testBuild({ context, files })
  })

  test('cjs import', async (context) => {
    await testBuild({
      context,
      files,
      options: {
        format: 'cjs',
      },
    })
  })
}

test('entry structure', async (context) => {
  const files = {
    'src/index.ts': '',
    'src/utils/index.ts': '',
  }
  await testBuild({
    context,
    files,
    options: {
      entry: Object.keys(files),
    },
  })
})

test('bundle dts', async (context) => {
  const files = {
    'src/index.ts': `
      export { str } from './utils/types';
      export { shared } from './utils/shared';
      `,
    'src/utils/types.ts': 'export let str = "hello"',
    'src/utils/shared.ts': 'export let shared = 10',
  }
  await testBuild({
    context,
    files,
    options: {
      entry: ['src/index.ts'],
      dts: true,
    },
  })
})

test('cjs default', async (context) => {
  const files = {
    'index.ts': `export default function hello(): void {
      console.log('Hello!')
    }`,
  }
  await testBuild({
    context,
    files,
    options: {
      format: ['esm', 'cjs'],
      dts: true,
    },
  })
})

test('fixed extension', async (context) => {
  const files = {
    'index.ts': `export default 10`,
  }
  await testBuild({
    context,
    files,
    options: {
      format: ['esm', 'cjs'],
      fixedExtension: true,
      dts: true,
    },
  })
})

test('custom extension', async (context) => {
  const files = {
    'index.ts': `export default 10`,
  }
  const { outputFiles } = await testBuild({
    context,
    files,
    options: {
      dts: true,
      outExtensions: () => ({ js: '.some.mjs', dts: '.some.d.mts' }),
    },
  })
  expect(outputFiles).toMatchInlineSnapshot(`
    [
      "index.some.d.mts",
      "index.some.mjs",
    ]
  `)
})

test('noExternal', async (context) => {
  const files = {
    'index.ts': `export * from 'cac'`,
  }
  await testBuild({
    context,
    files,
    options: {
      noExternal: ['cac'],
      plugins: [
        {
          name: 'remove-code',
          load(id) {
            if (id.replaceAll('\\', '/').includes('/node_modules/cac')) {
              return 'export const cac = "[CAC CODE]"'
            }
          },
        },
      ],
    },
  })
})

test('fromVite', async (context) => {
  const files = {
    'index.ts': `export default 10`,
    'tsdown.config.ts': `
    import { resolve } from 'node:path'
    export default {
      entry: "index.ts",
      fromVite: true,
    }`,
    'vite.config.ts': `
    export default {
      resolve: { alias: { '~': '/' } },
      plugins: [{ name: 'expected' }],
    }
    `,
  }
  const { testDir } = await writeFixtures(context, files)
  const restoreCwd = chdir(testDir)
  const options = await resolveOptions({
    config: testDir,
    logLevel: 'silent',
  })
  expect(options.configs).toMatchObject([
    {
      fromVite: true,
      alias: {
        '~': '/',
      },
      plugins: [
        [
          {
            name: 'expected',
          },
        ],
        [],
      ],
    },
  ])
  restoreCwd()
})

test('resolve dependency for dts', async (context) => {
  const files = {
    'index.ts': `export type { GlobOptions } from 'tinyglobby'
    export type * from 'unconfig'`,
  }
  const { snapshot } = await testBuild({
    context,
    files,
    options: {
      dts: { resolve: ['tinyglobby'] },
    },
  })
  expect(snapshot).contain(`export * from "unconfig"`)
})

test('resolve paths in tsconfig', async (context) => {
  const files = {
    'index.ts': `export * from '@/mod'`,
    'mod.ts': `export const mod = 42`,
    '../tsconfig.build.json': JSON.stringify({
      compilerOptions: {
        paths: { '@/*': ['./resolve-paths-in-tsconfig/*'] },
      },
    }),
  }
  await testBuild({
    context,
    files,
    options: {
      dts: { oxc: true },
      tsconfig: 'tsconfig.build.json',
    },
  })
})

test('hooks', async (context) => {
  const fn = vi.fn()
  const files = {
    'index.ts': `export default 10`,
  }
  await testBuild({
    context,
    files,
    options: {
      hooks: {
        'build:prepare': fn,
        'build:before': fn,
        'build:done': fn,
      },
    },
  })
  expect(fn).toBeCalledTimes(3)
})

test('env flag', async (context) => {
  const files = {
    'index.ts': `export const env = process.env.NODE_ENV
    export const meta = import.meta.env.NODE_ENV
    export const custom = import.meta.env.CUSTOM
    export const debug = import.meta.env.DEBUG
    `,
  }
  const { snapshot } = await testBuild({
    context,
    files,
    options: {
      env: {
        NODE_ENV: 'production',
        CUSTOM: 'tsdown',
        DEBUG: true,
      },
    },
  })
  expect(snapshot).contains('const env = "production"')
  expect(snapshot).contains('const meta = "production"')
  expect(snapshot).contains('const custom = "tsdown"')
  expect(snapshot).contains('const debug = true')
})

test('minify', async (context) => {
  const files = { 'index.ts': `export const foo = true` }
  const { snapshot } = await testBuild({
    context,
    files,
    options: {
      minify: {
        mangle: true,
        compress: true,
        removeWhitespace: false,
      },
    },
  })
  expect(snapshot).contains('!0')
  expect(snapshot).not.contains('true')
  expect(snapshot).not.contains('const foo')
})

test('iife and umd', async (context) => {
  const files = { 'index.ts': `export const foo = true` }
  const { outputFiles } = await testBuild({
    context,
    files,
    options: {
      format: ['iife', 'umd'],
      globalName: 'Lib',
    },
  })
  expect(outputFiles).toMatchInlineSnapshot(`
    [
      "index.iife.js",
      "index.umd.js",
    ]
  `)
})

test('without hash and filename conflict', async (context) => {
  const files = {
    'index.ts': `
      import { foo as utilsFoo } from './utils/foo.ts'
      export * from './foo.ts'
      export { utilsFoo }
    `,
    'run.ts': `
      import { foo } from "./foo";
      import { foo as utilsFoo } from "./utils/foo";

      foo("hello world");
      utilsFoo("hello world");
    `,
    'foo.ts': `
      export const foo = (a: string) => {
        console.log("foo:" + a)
      }
    `,
    'utils/foo.ts': `
      export const foo = (a: string) => {
        console.log("utils/foo:" + a)
      }
    `,
  }
  const { outputFiles } = await testBuild({
    context,
    files,
    options: {
      entry: ['index.ts', 'run.ts'],
      hash: false,
    },
  })
  expect(outputFiles).toMatchInlineSnapshot(`
    [
      "foo.js",
      "index.js",
      "run.js",
    ]
  `)
})

test('cwd option', async (context) => {
  const files = {
    'test/index.ts': `export default 10`,
  }
  await testBuild({
    context,
    files,
    options: (cwd) => ({ cwd: path.join(cwd, 'test') }),
    expectDir: '../test/dist',
  })
})

test('loader option', async (context) => {
  const files = {
    'index.ts': `
      export { default as a } from './a.a';
      export { default as b } from './b.b';
      export { default as c } from './c.c';
      export { default as d } from './d.d';
    `,
    'a.a': `hello-world`,
    'b.b': `hello-world`,
    'c.c': `hello-world`,
    'd.d': `hello-world`,
  }
  await testBuild({
    context,
    files,
    options: {
      loader: {
        '.a': 'dataurl',
        '.b': 'base64',
        '.c': 'text',
        '.d': 'binary',
      },
    },
  })
})

test('workspace option', async (context) => {
  const files = {
    'package.json': JSON.stringify({ name: 'workspace' }),
    'packages/foo/src/index.ts': `export default 10`,
    'packages/foo/package.json': JSON.stringify({ name: 'foo' }),
    'packages/bar/index.ts': `export default 12`,
    'packages/bar/package.json': JSON.stringify({ name: 'bar' }),
    'packages/bar/tsdown.config.ts': `
      export default {
        entry: ['index.ts'],
      }
    `,
  }
  const options: Options = {
    workspace: true,
    entry: ['src/index.ts'],
  }
  await testBuild({
    context,
    files,
    options,
    expectDir: '..',
    expectPattern: '**/dist',
  })
})

test('banner and footer option', async (context) => {
  const content = `console.log("Hello, world!")`
  const { fileMap } = await testBuild({
    context,
    files: {
      'index.ts': content,
    },
    options: {
      dts: true,
      banner: {
        js: '// js banner',
        dts: '// dts banner',
      },
      footer: {
        js: '// js footer',
        dts: '// dts footer',
      },
    },
  })

  expect(fileMap['index.js']).toContain('// js banner')
  expect(fileMap['index.js']).toContain('// js footer')

  expect(fileMap['index.d.ts']).toContain('// dts banner')
  expect(fileMap['index.d.ts']).toContain('// dts footer')
})

test('dts enabled when exports.types exists', async (context) => {
  const files = {
    'index.ts': `export const hello = "world"`,
    'package.json': JSON.stringify({
      name: 'test-pkg',
      // Note: no "types" field, only exports.types
      exports: {
        types: './dist/index.d.ts',
        import: './dist/index.js'
      }
    })
  }
  
  const { outputFiles } = await testBuild({
    context,
    files,
    options: {
      dts: undefined, // Allow auto-detection
    },
  })
  
  expect(outputFiles).toContain('index.d.mts')
})

test('dts enabled when exports["."].types exists', async (context) => {
  const files = {
    'index.ts': `export const hello = "world"`,
    'package.json': JSON.stringify({
      name: 'test-pkg',
      // Note: no "types" field, only exports["."].types
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js'
        }
      }
    })
  }
  
  const { outputFiles } = await testBuild({
    context,
    files,
    options: {
      dts: undefined, // Allow auto-detection
    },
  })
  
  expect(outputFiles).toContain('index.d.mts')
})

test('dts not enabled when no types field and no exports.types', async (context) => {
  const files = {
    'index.ts': `export const hello = "world"`,
    'package.json': JSON.stringify({
      name: 'test-pkg',
      // Note: no "types" field and no exports.types
      exports: {
        import: './dist/index.js'
      }
    })
  }
  
  const { outputFiles } = await testBuild({
    context,
    files,
    options: {
      dts: undefined, // Allow auto-detection
    },
  })
  
  expect(outputFiles).not.toContain('index.d.mts')
  expect(outputFiles).toContain('index.mjs')
})
