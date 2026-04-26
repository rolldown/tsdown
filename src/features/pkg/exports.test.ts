import path from 'node:path'
import process from 'node:process'
import { describe, expect, test } from 'vitest'
import { globalLogger } from '../../utils/logger.ts'
import {
  generateExports as _generateExports,
  hasExportsTypes,
} from './exports.ts'
import type { ResolvedConfig } from '../../config/types.ts'
import type { ChunksByFormat, RolldownChunk } from '../../utils/chunks.ts'

const cwd = process.cwd()
const FAKE_PACKAGE_JSON = {
  name: 'fake-pkg',
  packageJsonPath: path.join(cwd, 'package.json'),
}
const DEFAULT_CSS_OPTIONS = {}

function generateExports(
  chunks: ChunksByFormat = {},
  options: {
    exports?: ResolvedConfig['exports']
    css?: ResolvedConfig['css']
    logger?: ResolvedConfig['logger']
  } = {},
  pkg = FAKE_PACKAGE_JSON,
) {
  return _generateExports(pkg, chunks, {
    exports: {},
    logger: globalLogger,
    css: DEFAULT_CSS_OPTIONS,
    cwd,
    ...options,
  })
}

describe('generateExports', () => {
  test('no entries', async ({ expect }) => {
    const results = generateExports()
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
    expect(
      'No CJS or ESM formats found in chunks for package fake-pkg',
    ).toHaveBeenWarned()
  })

  test('only one entry', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('main.js'), genChunk('chunk.js', false)],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./main.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('index entry', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('index.js'), genChunk('foo.js')],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./foo": "./foo.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('index entry in dir', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('index.js'), genChunk('foo/index.js')],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./foo": "./foo/index.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('multiple entries', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('foo.js'), genChunk('bar.js')],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          "./bar": "./bar.js",
          "./foo": "./foo.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('dual formats', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('foo.js')],
      cjs: [genChunk('foo.cjs')],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": {
            "import": "./foo.js",
            "require": "./foo.cjs",
          },
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": "./foo.cjs",
        "module": "./foo.js",
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('dts', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('foo.js'), genChunk('foo.d.ts')],
      cjs: [genChunk('foo.cjs'), genChunk('foo.d.cts')],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": {
            "import": "./foo.js",
            "require": "./foo.cjs",
          },
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": "./foo.cjs",
        "module": "./foo.js",
        "publishBin": undefined,
        "publishExports": undefined,
        "types": "./foo.d.cts",
      }
    `)
  })

  test('fixed extension', async ({ expect }) => {
    const results = generateExports({
      es: [genChunk('index.mjs'), genChunk('index.d.mts')],
      cjs: [genChunk('index.cjs'), genChunk('index.d.cts')],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": {
            "import": "./index.mjs",
            "require": "./index.cjs",
          },
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": "./index.cjs",
        "module": "./index.mjs",
        "publishBin": undefined,
        "publishExports": undefined,
        "types": "./index.d.cts",
      }
    `)
  })

  test('dev exports: dev condition', async ({ expect }) => {
    const results = await generateExports(
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      {
        exports: { devExports: '@my-org/source' },
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./index.cjs",
        "module": "./index.js",
        "exports": {
          ".": {
            "@my-org/source": "./SRC/index.js",
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
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      {
        exports: { devExports: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./SRC/index.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": "./index.cjs",
        "module": "./index.js",
        "publishBin": undefined,
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
      { es: [genChunk('index.js')] },
      {
        exports: {
          devExports: '@my-org/source',
          customExports(exports: Record<string, any>) {
            exports['./TEST'] = './TEST'
            return Promise.resolve(exports)
          },
        },
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "exports": {
          ".": {
            "@my-org/source": "./SRC/index.js",
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

  test('customExports via object', async ({ expect }) => {
    const results = await generateExports(
      { es: [genChunk('index.js')] },
      {
        exports: {
          devExports: '@my-org/source',
          customExports: {
            './TEST': './TEST',
          },
        },
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "exports": {
          ".": {
            "@my-org/source": "./SRC/index.js",
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
      { es: [genChunk('index.js'), genChunk('foo.js'), genChunk('bar.js')] },
      {
        exports: { exclude: [/ba/] },
      },
    )

    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./foo": "./foo.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('exclude via glob', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('index.js'), genChunk('foo.js'), genChunk('abc/bar.js')],
      },
      {
        exports: { exclude: ['**/bar'] },
      },
    )

    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./foo": "./foo.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('multiple excludes', async ({ expect }) => {
    const results = generateExports(
      { es: [genChunk('foo.js'), genChunk('abc/bar.js')] },
      {
        exports: { exclude: ['**/bar', /foo/] },
      },
    )

    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('export all', async ({ expect }) => {
    const results = generateExports(
      { es: [genChunk('index.js')], cjs: [genChunk('index.cjs')] },
      {
        exports: { all: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs",
          },
          "./*": "./*",
        },
        "inlinedDependencies": undefined,
        "main": "./index.cjs",
        "module": "./index.js",
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('export all includes non-entry chunks', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('index.js'), genChunk('utils.js', false)],
      },
      {
        exports: { all: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./*": "./*",
          "./utils": "./utils.js",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('export all excludes virtual modules', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk('index.js'),
          genChunk('virtual.js', false, '\0virtual-module'),
        ],
      },
      {
        exports: { all: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./*": "./*",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('export all excludes node_modules chunks', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk('index.js'),
          genChunk('lodash.js', false, '/project/node_modules/lodash/index.js'),
        ],
      },
      {
        exports: { all: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./*": "./*",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('windows-like paths for subpackages', async ({ expect }) => {
    const results = generateExports({
      es: [
        genChunk('index.js'),
        genChunk('index.d.ts'),
        genChunk(String.raw`foo\index.js`),
        genChunk(String.raw`foo\index.d.ts`),
        genChunk(String.raw`bar\baz.js`),
        genChunk(String.raw`bar\baz.d.ts`),
      ],
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./bar/baz": "./bar/baz.js",
          "./foo": "./foo/index.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('windows-like paths for subpackages with dual format', async ({
    expect,
  }) => {
    const results = generateExports({
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
    })
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
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
        "inlinedDependencies": undefined,
        "main": "./index.cjs",
        "module": "./index.js",
        "publishBin": undefined,
        "publishExports": undefined,
        "types": "./index.d.cts",
      }
    `)
  })

  test('generate css exports', async ({ expect }) => {
    const results = generateExports(
      { es: [genChunk('index.js'), genAsset('style.css')] },
      {
        exports: {},
        css: { splitting: false },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./package.json": "./package.json",
          "./style.css": "./style.css",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('should not generate css exports when css chunk not exists', async ({
    expect,
  }) => {
    const results = generateExports(
      { es: [genChunk('index.js')] },
      {
        exports: {},
        css: { splitting: false },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('generate css exports with custom fileName', async ({ expect }) => {
    const results = generateExports(
      { es: [genChunk('index.js'), genAsset('custom.css')] },
      {
        exports: {},
        css: { splitting: false, fileName: 'custom.css' },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./custom.css": "./custom.css",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('generate css exports with custom outDir', async ({ expect }) => {
    const results = generateExports(
      { es: [genChunk('index.js'), genAsset('style.css', 'dist')] },
      {
        exports: {},
        css: { splitting: false },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./package.json": "./package.json",
          "./style.css": "./dist/style.css",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('bin: true with single shebang entry', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            undefined,
            '#!/usr/bin/env node\nconsole.log("hello")',
          ),
        ],
      },
      { exports: { bin: true } },
    )
    await expect(results).resolves.toMatchObject({
      bin: { 'fake-pkg': './cli.js' },
    })
  })

  test('bin: true with no shebangs warns', async ({ expect }) => {
    const warnings: string[] = []
    const logger = {
      ...globalLogger,
      warn: (...msgs: any[]) => {
        warnings.push(msgs.join(' '))
      },
    }
    const results = await generateExports(
      { es: [genChunk('index.js', true, undefined, 'console.log("hello")')] },
      { exports: { bin: true }, logger },
    )
    expect(results.bin).toBeUndefined()
    expect(
      warnings.some((w) => w.includes('no entry chunks with shebangs')),
    ).toBe(true)
  })

  test('bin: true with multiple shebangs throws', async ({ expect }) => {
    await expect(
      generateExports(
        {
          es: [
            genChunk('cli.js', true, undefined, '#!/usr/bin/env node\n'),
            genChunk('tool.js', true, undefined, '#!/usr/bin/env node\n'),
          ],
        },
        { exports: { bin: true } },
      ),
    ).rejects.toThrow('Multiple entry chunks with shebangs found')
  })

  test('bin: true prefers ESM over CJS', async ({ expect }) => {
    const facadeId = path.resolve('./SRC/cli.js')
    const results = generateExports(
      {
        es: [genChunk('cli.mjs', true, facadeId, '#!/usr/bin/env node\n')],
        cjs: [genChunk('cli.cjs', true, facadeId, '#!/usr/bin/env node\n')],
      },
      { exports: { bin: true } },
    )
    await expect(results).resolves.toMatchObject({
      bin: { 'fake-pkg': './cli.mjs' },
    })
  })

  test('bin: string form', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            path.resolve('./src/cli.ts'),
            '#!/usr/bin/env node\n',
          ),
        ],
      },
      { exports: { bin: './src/cli.ts' } },
    )
    await expect(results).resolves.toMatchObject({
      bin: { 'fake-pkg': './cli.js' },
    })
  })

  test('bin: string form warns without shebang', async ({ expect }) => {
    const warnings: string[] = []
    const logger = {
      ...globalLogger,
      warn: (...msgs: any[]) => {
        warnings.push(msgs.join(' '))
      },
    }
    const results = await generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            path.resolve('./src/cli.ts'),
            'console.log("hello")',
          ),
        ],
      },
      { exports: { bin: './src/cli.ts' }, logger },
    )
    expect(results.bin).toEqual({ 'fake-pkg': './cli.js' })
    expect(
      warnings.some((w) => w.includes('does not contain a shebang line')),
    ).toBe(true)
  })

  test('bin: string form throws when no matching chunk', async ({ expect }) => {
    await expect(
      generateExports(
        { es: [genChunk('index.js')] },
        { exports: { bin: './src/cli.ts' } },
      ),
    ).rejects.toThrow(
      'Could not find output chunk for bin entry "./src/cli.ts"',
    )
  })

  test('bin: object form', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            path.resolve('./src/cli.ts'),
            '#!/usr/bin/env node\n',
          ),
          genChunk(
            'tool.js',
            true,
            path.resolve('./src/tool.ts'),
            '#!/usr/bin/env node\n',
          ),
        ],
      },
      {
        exports: {
          bin: {
            mycli: './src/cli.ts',
            mytool: './src/tool.ts',
          },
        },
      },
    )
    await expect(results).resolves.toMatchObject({
      bin: {
        mycli: './cli.js',
        mytool: './tool.js',
      },
    })
  })

  test('bin: scoped package name', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('cli.js', true, undefined, '#!/usr/bin/env node\n')],
      },
      { exports: { bin: true } },
      {
        name: '@scope/my-tool',
        packageJsonPath: path.join(cwd, 'package.json'),
      },
    )
    await expect(results).resolves.toMatchObject({
      bin: { 'my-tool': './cli.js' },
    })
  })

  test('bin: object form with devExports', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            path.resolve('./src/cli.ts'),
            '#!/usr/bin/env node\n',
          ),
        ],
      },
      {
        exports: {
          devExports: true,
          bin: {
            mycli: './src/cli.ts',
          },
        },
      },
    )
    await expect(results).resolves.toMatchObject({
      bin: { mycli: './src/cli.ts' },
      publishBin: { mycli: './cli.js' },
    })
  })

  test('bin: true with devExports', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            path.resolve('./src/cli.ts'),
            '#!/usr/bin/env node\nconsole.log("hello")',
          ),
        ],
      },
      { exports: { devExports: true, bin: true } },
    )
    await expect(results).resolves.toMatchObject({
      bin: { 'fake-pkg': './src/cli.ts' },
      publishBin: { 'fake-pkg': './cli.js' },
    })
  })

  test('bin: string form with devExports', async ({ expect }) => {
    const results = generateExports(
      {
        es: [
          genChunk(
            'cli.js',
            true,
            path.resolve('./src/cli.ts'),
            '#!/usr/bin/env node\n',
          ),
        ],
      },
      { exports: { devExports: true, bin: './src/cli.ts' } },
    )
    await expect(results).resolves.toMatchObject({
      bin: { 'fake-pkg': './src/cli.ts' },
      publishBin: { 'fake-pkg': './cli.js' },
    })
  })

  test('extensions adds .js to subpath export keys', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('index.js'), genChunk('foo.js'), genChunk('bar.js')],
      },
      {
        exports: { extensions: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./bar.js": "./bar.js",
          "./foo.js": "./foo.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('extensions with directory index entries', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('index.js'), genChunk('foo/index.js')],
      },
      {
        exports: { extensions: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./index.js",
          "./foo.js": "./foo/index.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('extensions with dual formats', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('index.js'), genChunk('utils.js')],
        cjs: [genChunk('index.cjs'), genChunk('utils.cjs')],
      },
      {
        exports: { extensions: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs",
          },
          "./package.json": "./package.json",
          "./utils.js": {
            "import": "./utils.js",
            "require": "./utils.cjs",
          },
        },
        "inlinedDependencies": undefined,
        "main": "./index.cjs",
        "module": "./index.js",
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('extensions does not affect root export', async ({ expect }) => {
    const results = generateExports(
      {
        es: [genChunk('main.js')],
      },
      {
        exports: { extensions: true },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": "./main.js",
          "./package.json": "./package.json",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
        "publishExports": undefined,
        "types": undefined,
      }
    `)
  })

  test('extensions with devExports', async ({ expect }) => {
    const results = await generateExports(
      {
        es: [genChunk('index.js'), genChunk('utils.js')],
        cjs: [genChunk('index.cjs'), genChunk('utils.cjs')],
      },
      {
        exports: { extensions: true, devExports: '@my-org/source' },
      },
    )
    // key order matters
    expect(JSON.stringify(results, undefined, 2)).toMatchInlineSnapshot(`
      "{
        "main": "./index.cjs",
        "module": "./index.js",
        "exports": {
          ".": {
            "@my-org/source": "./SRC/index.js",
            "import": "./index.js",
            "require": "./index.cjs"
          },
          "./utils.js": {
            "@my-org/source": "./SRC/utils.js",
            "import": "./utils.js",
            "require": "./utils.cjs"
          },
          "./package.json": "./package.json"
        },
        "publishExports": {
          ".": {
            "import": "./index.js",
            "require": "./index.cjs"
          },
          "./utils.js": {
            "import": "./utils.js",
            "require": "./utils.cjs"
          },
          "./package.json": "./package.json"
        }
      }"
    `)
  })

  test('generate css publish exports', async ({ expect }) => {
    const results = generateExports(
      { es: [genChunk('index.js'), genAsset('style.css')] },
      {
        exports: {
          devExports: '@my-org/source',
        },
        css: { splitting: false },
      },
    )
    await expect(results).resolves.toMatchInlineSnapshot(`
      {
        "bin": undefined,
        "exports": {
          ".": {
            "@my-org/source": "./SRC/index.js",
            "default": "./index.js",
          },
          "./package.json": "./package.json",
          "./style.css": "./style.css",
        },
        "inlinedDependencies": undefined,
        "main": undefined,
        "module": undefined,
        "publishBin": undefined,
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

describe('hasExportsTypes', () => {
  test('nullish or string', () => {
    expect(hasExportsTypes(undefined)).toBe(false)
    expect(hasExportsTypes(null)).toBe(false)
    expect(hasExportsTypes('./index.js')).toBe(false)
  })

  test('top-level types condition', () => {
    expect(
      hasExportsTypes({ types: './index.d.ts', default: './index.js' }),
    ).toBe(true)
  })

  test('types under "."', () => {
    expect(
      hasExportsTypes({
        '.': { types: './index.d.ts', default: './index.js' },
      }),
    ).toBe(true)
  })

  test('types nested under "import" / "require" (issue #885)', () => {
    expect(
      hasExportsTypes({
        '.': {
          import: { default: './esm/index.js', types: './esm/index.d.ts' },
          require: { default: './cjs/index.cjs', types: './cjs/index.d.cts' },
        },
      }),
    ).toBe(true)
  })

  test('types under arbitrary subpath', () => {
    expect(
      hasExportsTypes({
        './utils': { types: './utils.d.ts', default: './utils.js' },
      }),
    ).toBe(true)
  })

  test('types in array fallback', () => {
    expect(
      hasExportsTypes({ '.': [{ types: './index.d.ts' }, './index.js'] }),
    ).toBe(true)
  })

  test('no types anywhere', () => {
    expect(
      hasExportsTypes({
        '.': { import: './esm/index.js', require: './cjs/index.cjs' },
        './utils': './utils.js',
      }),
    ).toBe(false)
  })
})

function genChunk(
  fileName: string,
  isEntry = true,
  facadeModuleId?: string,
  code = '',
) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    type: 'chunk',
    fileName,
    isEntry,
    facadeModuleId: facadeModuleId ?? path.resolve(`./SRC/${fileName}`),
    outDir: cwd,
    code,
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
