import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

function getCssFileName(outputFiles: string[], preferred: string): string {
  if (outputFiles.includes(preferred)) return preferred
  const file = outputFiles.find((value) => value.endsWith('.css'))
  if (!file) {
    throw new Error('No CSS file found in output files')
  }
  return file
}

describe('css assets', () => {
  // Known gap: URL resolution with spaces in asset paths is not reliably rewritten
  // through the CSS url() loader pipeline yet.
  test.fails(
    'spec-gap: asset paths with spaces bundle correctly',
    async (context) => {
      // Source: esbuild TestCSSAssetPathsWithSpacesBundle
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2621
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `
          a { background-image: url('./images/icon one.png'); }
          b { background-image: url("./images/icon two.png"); }
        `,
          'images/icon one.png':
            '\u0089\u0050\u004E\u0047\u000D\u000A\u001A\u000A',
          'images/icon two.png':
            '\u0089\u0050\u004E\u0047\u000D\u000A\u001A\u000A',
        },
        options: {
          entry: ['entry.css'],
          loader: {
            '.png': 'dataurl',
          },
        },
      })

      const cssFile = getCssFileName(outputFiles, 'entry.css')
      const css = fileMap[cssFile]

      expect(css).toContain('data:')
      expect(css).not.toContain('icon one.png')
      expect(css).not.toContain('icon two.png')
    },
  )

  test('regression: url() in @supports prelude is not resolved', async (context) => {
    // Source: esbuild TestIgnoreURLsInAtRulePrelude
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1250
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `
          @supports (background: url(ignored.png)) {
            a { color: red; }
          }
        `,
      },
      options: {
        entry: ['entry.css'],
      },
    })

    const cssFile = getCssFileName(outputFiles, 'entry.css')
    const css = fileMap[cssFile]

    expect(css).toContain('ignored.png')
    expect(css).toContain('a')
  })

  // Known gap: tsdown does not yet rebase nested relative url() references across
  // @import boundaries for this loader-driven case.
  test.fails(
    'spec-gap: css url() handles nested directories',
    async (context) => {
      // Source: esbuild TestFileImportURLInCSS (adapted path case)
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1223
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'styles/entry.css': `@import './parts/one.css';`,
          'styles/parts/one.css': `a { background: url('../assets/example.txt') }`,
          'styles/assets/example.txt': 'nested text asset',
        },
        options: {
          entry: ['styles/entry.css'],
          loader: {
            '.txt': 'text',
          },
        },
      })

      const cssFile = getCssFileName(outputFiles, 'entry.css')
      const css = fileMap[cssFile]

      expect(css).toContain('url(')
      expect(css).not.toContain('../assets/example.txt')
      expect(outputFiles).toContain('entry.mjs')
    },
  )
})
