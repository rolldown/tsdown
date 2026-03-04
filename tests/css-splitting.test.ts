import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

function cssFiles(outputFiles: string[]): string[] {
  return outputFiles.filter((file) => file.endsWith('.css'))
}

function findHashedCss(
  outputFiles: string[],
  prefix: string,
): string | undefined {
  return outputFiles.find(
    (file) => file.startsWith(prefix) && file.endsWith('.css'),
  )
}

describe('css splitting', () => {
  test('regression: mixed js/css entries with splitting do not crash', async (context) => {
    // Source: esbuild TestCSSAndJavaScriptCodeSplittingIssue1064
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2029
    const { outputFiles } = await testBuild({
      context,
      files: {
        'a.ts': `import shared from './shared'; console.log(shared() + 1)`,
        'b.ts': `import shared from './shared'; console.log(shared() + 2)`,
        'c.css': `@import './shared.css'; body { color: red }`,
        'd.css': `@import './shared.css'; body { color: blue }`,
        'shared.ts': `export default function shared() { return 3 }`,
        'shared.css': `body { background: black }`,
      },
      options: {
        entry: ['a.ts', 'b.ts', 'c.css', 'd.css'],
        css: { splitting: true },
      },
    })

    expect(outputFiles).toContain('a.mjs')
    expect(outputFiles).toContain('b.mjs')
    expect(outputFiles).toContain('c.css')
    expect(outputFiles).toContain('d.css')
  })

  test('regression: splitting=true keeps async css in separate chunk', async (context) => {
    // Source: esbuild TestCSSAndJavaScriptCodeSplittingIssue1064 (adapted async case)
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2029
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `
          import './base.css'
          export const load = () => import('./async')
        `,
        'base.css': `.base { color: red }`,
        'async.ts': `import './async.css'`,
        'async.css': `.async { color: blue }`,
      },
      options: {
        css: {
          splitting: true,
          fileName: 'index.css',
        },
      },
    })

    expect(fileMap['index.css']).toContain('.base')
    expect(fileMap['index.css']).not.toContain('.async')
    expect(findHashedCss(outputFiles, 'async-')).toBeTruthy()
  })

  test('regression: splitting=false merges async css into one file', async (context) => {
    // Source: esbuild TestCSSAndJavaScriptCodeSplittingIssue1064 (adapted async case)
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2029
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `
          import './base.css'
          export const load = () => import('./async')
        `,
        'base.css': `.base { color: red }`,
        'async.ts': `import './async.css'`,
        'async.css': `.async { color: blue }`,
      },
      options: {
        css: {
          splitting: false,
          fileName: 'bundle.css',
        },
      },
    })

    expect(cssFiles(outputFiles)).toEqual(['bundle.css'])
    expect(fileMap['bundle.css']).toContain('.base')
    expect(fileMap['bundle.css']).toContain('.async')
  })

  test('regression: two js entries can share one merged css output', async (context) => {
    // Source: esbuild TestMetafileCSSBundleTwoToOne (adapted output-level behavior)
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2229
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'a.ts': `import './shared.css'; import './a.css'`,
        'b.ts': `import './shared.css'; import './b.css'`,
        'shared.css': `.shared { color: black }`,
        'a.css': `.a { color: red }`,
        'b.css': `.b { color: blue }`,
      },
      options: {
        entry: ['a.ts', 'b.ts'],
        css: {
          splitting: false,
          fileName: 'bundle.css',
        },
      },
    })

    expect(outputFiles).toContain('a.mjs')
    expect(outputFiles).toContain('b.mjs')
    expect(cssFiles(outputFiles)).toEqual(['bundle.css'])
    expect(fileMap['bundle.css']).toContain('.shared')
    expect(fileMap['bundle.css']).toContain('.a')
    expect(fileMap['bundle.css']).toContain('.b')
  })

  test('regression: shared @import content is not duplicated in single-entry bundle', async (context) => {
    // Source: esbuild TestDeduplicateRules (adapted single-entry dedupe behavior)
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2261
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `@import './a.css'; @import './b.css';`,
        'a.css': `@import './shared.css'; .a { color: red }`,
        'b.css': `@import './shared.css'; .b { color: blue }`,
        'shared.css': `.shared { color: black }`,
      },
      options: {
        entry: ['entry.css'],
      },
    })

    const cssFile = cssFiles(outputFiles)[0]
    if (!cssFile) {
      throw new Error('Expected one CSS output file')
    }
    const css = fileMap[cssFile]
    const sharedMatches = css.match(/\.shared/g) ?? []

    expect(cssFile).toBe('style.css')
    expect(sharedMatches).toHaveLength(1)
  })

  // Known gap: multi-entry pure CSS builds are currently collapsed into a shared
  // output instead of preserving one CSS artifact per entry with shared imports.
  test.fails(
    'spec-gap: multi-entry css should emit per-entry css files with shared content',
    async (context) => {
      // Source: tsdown issue #668 and esbuild multi-entry expectations
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L99
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
      expect(fileMap['entry1.css']).toContain('class-shared')
      expect(fileMap['entry2.css']).toContain('class-shared')
    },
  )
})
