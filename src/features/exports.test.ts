import path from 'node:path'
import process from 'node:process'
import { describe, test } from 'vitest'
import { generateExports } from './exports'
import type { OutputChunk } from 'rolldown'

const cwd = process.cwd()
const FAKE_PACKAGE_JSON = {
  packageJsonPath: path.join(cwd, 'package.json'),
}

describe.concurrent('generateExports', () => {
  test('no entries', async ({ expect }) => {
    const results = generateExports(FAKE_PACKAGE_JSON, cwd, {}, {})
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('only one entry', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('main.js')],
      },
      {},
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./main.js",
          "./package.json": "./package.json",
        },
        "main": "./main.js",
        "module": "./main.js",
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('index entry', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('index.js'), genChunk('foo.js')],
      },
      {},
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./foo": "./foo.js",
          "./package.json": "./package.json",
        },
        "main": "./index.js",
        "module": "./index.js",
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('index entry in dir', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('index.js'), genChunk('foo/index.js')],
      },
      {},
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./foo": "./foo/index.js",
          "./package.json": "./package.json",
        },
        "main": "./index.js",
        "module": "./index.js",
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('multiple entries', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('foo.js'), genChunk('bar.js')],
      },
      {},
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          "./bar": "./bar.js",
          "./foo": "./foo.js",
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('dual formats', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('foo.js')],
        cjs: [genChunk('foo.cjs')],
      },
      {},
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": {
            "import": "./foo.js",
            "require": "./foo.cjs",
          },
          "./package.json": "./package.json",
        },
        "main": "./foo.cjs",
        "module": "./foo.js",
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('dts with single entry', async ({ expect }) => {
    const results = await generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('foo.js'), genChunk('foo.d.ts')],
      },
      { types: true },
    )
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./foo.js",
        "module": "./foo.js",
        "types": "./foo.d.ts",
        "exports": {
          ".": "./foo.js",
          "./package.json": "./package.json"
        }
      }"
    `)
  })

  test('dts with multiple entries', async ({ expect }) => {
    const results = await generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('foo.js'), genChunk('foo.d.ts')],
        cjs: [genChunk('foo.cjs'), genChunk('foo.d.cts')],
      },
      { types: true },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./foo.cjs",
        "module": "./foo.js",
        "types": "./foo.d.cts",
        "exports": {
          ".": {
            "import": {
              "types": "./foo.d.ts",
              "default": "./foo.js"
            },
            "require": {
              "types": "./foo.d.cts",
              "default": "./foo.cjs"
            }
          },
          "./package.json": "./package.json"
        }
      }"
    `)
  })

  test('fixed extension', async ({ expect }) => {
    const results = await generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      {
        es: [genChunk('index.mjs'), genChunk('index.d.mts')],
        cjs: [genChunk('index.cjs'), genChunk('index.d.cts')],
      },
      { types: true },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./index.cjs",
        "module": "./index.mjs",
        "types": "./index.d.cts",
        "exports": {
          ".": {
            "import": {
              "types": "./index.d.mts",
              "default": "./index.mjs"
            },
            "require": {
              "types": "./index.d.cts",
              "default": "./index.cjs"
            }
          },
          "./package.json": "./package.json"
        }
      }"
    `)
  })

  test('dev exports: dev condition', async ({ expect }) => {
    const results = await generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      { devExports: 'dev' },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./index.cjs",
        "module": "./index.js",
        "exports": {
          ".": {
            "dev": "./SRC/index.js",
            "import": "./index.js",
            "require": "./index.cjs"
          },
          "./package.json": "./package.json"
        },
        "publishExports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs"
          },
          "./package.json": "./package.json"
        }
      }"
    `)
  })

  test('dev exports: all conditions', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      { devExports: true },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./SRC/index.js",
          "./package.json": "./package.json",
        },
        "main": "./index.cjs",
        "module": "./index.js",
        "publishExports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs",
          },
          "./package.json": "./package.json",
        },
        "types": undefined,
      }
    `)
  })

  test('customExports', async ({ expect }) => {
    const results = await generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      { es: [genChunk('index.js')] },
      {
        devExports: 'dev',
        customExports(exports) {
          exports['./TEST'] = './TEST'
          return Promise.resolve(exports)
        },
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./index.js",
        "module": "./index.js",
        "exports": {
          ".": {
            "dev": "./SRC/index.js",
            "default": "./index.js"
          },
          "./package.json": "./package.json",
          "./TEST": "./TEST"
        },
        "publishExports": {
          ".": "./index.js",
          "./package.json": "./package.json",
          "./TEST": "./TEST"
        }
      }"
    `)
  })

  test('export all', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      cwd,
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      { all: true },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs",
          },
          "./*": "./*",
        },
        "main": "./index.cjs",
        "module": "./index.js",
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })
})

function genChunk(fileName: string) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    type: 'chunk',
    fileName,
    isEntry: true,
    facadeModuleId: `./SRC/${fileName}`,
  } as OutputChunk
}
