import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('css diagnostics', () => {
  test('regression: named import from css fails build', async (context) => {
    // Source: esbuild TestCSSFromJSMissingImport
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L127
    await expect(
      testBuild({
        context,
        files: {
          'entry.ts': `import { missing } from './a.css'; console.log(missing)`,
          'a.css': `.a { color: red }`,
        },
        options: {
          entry: ['entry.ts'],
        },
        snapshot: false,
      }),
    ).rejects.toThrow(/missing|export|a\.css/i)
  })

  test('regression: malformed @import in nested css fails build', async (context) => {
    // Source: esbuild TestCSSMalformedAtImport
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2462
    await expect(
      testBuild({
        context,
        files: {
          'entry.css': `
            @import './broken1.css';
            @import './broken2.css';
          `,
          'broken1.css': `@import url(https://example.com/broken1.css`,
          'broken2.css': `@import url("https://example.com/broken2.css"`,
        },
        options: {
          entry: ['entry.css'],
        },
        snapshot: false,
      }),
    ).rejects.toThrow(/Expected|\)|broken/i)
  })

  test('regression: namespace import from css keeps build successful', async (context) => {
    // Source: esbuild TestCSSFromJSMissingStarImport (adapted baseline)
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L148
    const { outputFiles } = await testBuild({
      context,
      files: {
        'entry.ts': `import * as ns from './a.css'; console.log(ns.missing)`,
        'a.css': `.a { color: red }`,
      },
      options: {
        entry: ['entry.ts'],
      },
    })

    expect(outputFiles).toContain('entry.mjs')
  })

  test('regression: namespace import missing symbol emits warning', async (context) => {
    // Source: esbuild TestCSSFromJSMissingStarImport
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L148
    const { warnings } = await testBuild({
      context,
      files: {
        'entry.ts': `import * as ns from './a.css'; console.log(ns.missing)`,
        'a.css': `.a { color: red }`,
      },
      options: {
        entry: ['entry.ts'],
      },
      snapshot: false,
    })

    expect(
      warnings.some((warning) =>
        /missing|undefined|a\.css/i.test(warning.message),
      ),
    ).toBe(true)
  })

  test('regression: undefined css namespace imports are warned', async (context) => {
    // Source: esbuild TestUndefinedImportWarningCSS
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2362
    const { warnings } = await testBuild({
      context,
      files: {
        'entry.ts': `
          import * as emptyCss from './empty.css'
          console.log(emptyCss.foo)
        `,
        'empty.css': '',
      },
      options: {
        entry: ['entry.ts'],
      },
      snapshot: false,
    })

    expect(
      warnings.some((warning) =>
        /foo|undefined|empty\.css/i.test(warning.message),
      ),
    ).toBe(true)
  })
})
