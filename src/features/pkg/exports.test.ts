import path from 'node:path'
import process from 'node:process'
import { describe, test } from 'vitest'
import { globalLogger } from '../../utils/logger.ts'
import { resolveCssOptions } from '../css.ts'
import { generateExports } from './exports.ts'
import type { RolldownChunk } from '../../utils/chunks.ts'

const cwd = process.cwd()
const FAKE_PACKAGE_JSON = {
  packageJsonPath: path.join(cwd, 'package.json'),
}
const DEFAULT_CSS_OPTIONS = resolveCssOptions()

describe.concurrent('generateExports', () => {
  test('no entries', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      {},
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
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
      { es: [genChunk('main.js'), genChunk('chunk.js', false)] },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./main.js",
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('index entry', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genChunk('foo.js')] },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
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

  test('index entry in dir', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genChunk('foo/index.js')] },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./foo": "./foo/index.js",
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('multiple entries', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('foo.js'), genChunk('bar.js')] },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
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
      {
        es: [genChunk('foo.js')],
        cjs: [genChunk('foo.cjs')],
      },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
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

  test('dts', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      {
        es: [genChunk('foo.js'), genChunk('foo.d.ts')],
        cjs: [genChunk('foo.cjs'), genChunk('foo.d.cts')],
      },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
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
        "types": "./foo.d.cts",
      }
    `)
  })

  test('fixed extension', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      {
        es: [genChunk('index.mjs'), genChunk('index.d.mts')],
        cjs: [genChunk('index.cjs'), genChunk('index.d.cts')],
      },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": {
            "import": "./index.mjs",
            "require": "./index.cjs",
          },
          "./package.json": "./package.json",
        },
        "main": "./index.cjs",
        "module": "./index.mjs",
        "publishExports": undefined,
        "types": "./index.d.cts",
      }
    `)
  })

  test('dev exports: dev condition', async ({ expect }) => {
    const results = await generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      {
        exports: { devExports: 'dev' },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./index.cjs",
        "module": "./index.js",
        "exports": {
          ".": {
            "dev": "./SRC/index.js",
            "require": "./index.cjs",
            "import": "./index.js"
          },
          "./package.json": "./package.json"
        },
        "publishExports": {
          ".": {
            "require": "./index.cjs",
            "import": "./index.js"
          },
          "./package.json": "./package.json"
        }
      }"
    `)
  })

  test('dev exports: all conditions', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      {
        exports: { devExports: true },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
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
      { es: [genChunk('index.js')] },
      {
        exports: {
          devExports: 'dev',
          customExports(exports: Record<string, any>) {
            exports['./TEST'] = './TEST'
            return Promise.resolve(exports)
          },
        },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
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

  test('exclude via regex', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genChunk('foo.js'), genChunk('bar.js')] },
      {
        exports: { exclude: [/bar/] },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )

    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
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

  test('exclude via glob', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      {
        es: [genChunk('index.js'), genChunk('foo.js'), genChunk('abc/bar.js')],
      },
      {
        exports: { exclude: ['**/bar.js'] },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )

    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
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

  test('multiple excludes', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('foo.js'), genChunk('abc/bar.js')] },
      {
        exports: { exclude: ['**/bar.js', /foo/] },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )

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

  test('export all', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      {
        exports: { all: true },
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
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

  test('windows-like paths for subpackages', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      {
        es: [
          genChunk('index.js'),
          genChunk('index.d.ts'),
          genChunk(String.raw`foo\index.js`),
          genChunk(String.raw`foo\index.d.ts`),
          genChunk(String.raw`bar\baz.js`),
          genChunk(String.raw`bar\baz.d.ts`),
        ],
      },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./bar/baz": "./bar/baz.js",
          "./foo": "./foo/index.js",
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('windows-like paths for subpackages with dual format', async ({
    expect,
  }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      {
        es: [
          genChunk('index.js'),
          genChunk('index.d.ts'),
          genChunk(String.raw`foo\index.js`),
          genChunk(String.raw`foo\index.d.ts`),
          genChunk(String.raw`bar\baz.js`),
          genChunk(String.raw`bar\baz.d.ts`),
        ],
        cjs: [
          genChunk('index.cjs'),
          genChunk('index.d.cts'),
          genChunk(String.raw`foo\index.cjs`),
          genChunk(String.raw`foo\index.d.cts`),
          genChunk(String.raw`bar\baz.cjs`),
          genChunk(String.raw`bar\baz.d.cts`),
        ],
      },
      {
        exports: {},
        logger: globalLogger,
        css: DEFAULT_CSS_OPTIONS,
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs",
          },
          "./bar/baz": {
            "import": "./bar/baz.js",
            "require": "./bar/baz.cjs",
          },
          "./foo": {
            "import": "./foo/index.js",
            "require": "./foo/index.cjs",
          },
          "./package.json": "./package.json",
        },
        "main": "./index.cjs",
        "module": "./index.js",
        "publishExports": undefined,
        "types": "./index.d.cts",
      }
    `)
  })

  test('generate css exports', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genAsset('style.css')] },
      {
        exports: {},
        logger: globalLogger,
        css: resolveCssOptions({ splitting: false }),
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./package.json": "./package.json",
          "./style.css": "./style.css",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('should not generate css exports when css chunk not exists', async ({
    expect,
  }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js')] },
      {
        exports: {},
        logger: globalLogger,
        css: resolveCssOptions({ splitting: false }),
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('generate css exports with custom fileName', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genAsset('custom.css')] },
      {
        exports: {},
        logger: globalLogger,
        css: resolveCssOptions({ splitting: false, fileName: 'custom.css' }),
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./custom.css": "./custom.css",
          "./package.json": "./package.json",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('generate css exports with custom outDir', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genAsset('style.css', 'dist')] },
      {
        exports: {},
        logger: globalLogger,
        css: resolveCssOptions({ splitting: false }),
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": "./index.js",
          "./package.json": "./package.json",
          "./style.css": "./dist/style.css",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('generate css publish exports', async ({ expect }) => {
    const results = generateExports(
      FAKE_PACKAGE_JSON,
      { es: [genChunk('index.js'), genAsset('style.css')] },
      {
        exports: {
          devExports: 'dev',
        },
        logger: globalLogger,
        css: resolveCssOptions({ splitting: false }),
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "exports": {
          ".": {
            "default": "./index.js",
            "dev": "./SRC/index.js",
          },
          "./package.json": "./package.json",
          "./style.css": "./style.css",
        },
        "main": undefined,
        "module": undefined,
        "publishExports": {
          ".": "./index.js",
          "./package.json": "./package.json",
          "./style.css": "./style.css",
        },
        "types": undefined,
      }
    `)
  })
})

function genChunk(fileName: string, isEntry = true) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    type: 'chunk',
    fileName,
    isEntry,
    facadeModuleId: `./SRC/${fileName}`,
    outDir: cwd,
  } as RolldownChunk
}

function genAsset(fileName: string, outDir = cwd) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    type: 'asset',
    fileName,
    outDir: path.resolve(cwd, outDir),
  } as RolldownChunk
}
