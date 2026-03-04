import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

function getCssFileName(outputFiles: string[], preferred: string): string {
  if (outputFiles.includes(preferred)) return preferred
  const firstCss = outputFiles.find((file) => file.endsWith('.css'))
  if (!firstCss) {
    throw new Error('No CSS file found in build output')
  }
  return firstCss
}

describe('css imports', () => {
  test('regression: css entry emits css and js outputs', async (context) => {
    // Source: esbuild TestCSSEntryPoint
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L14
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `body { background: white; color: black; }`,
      },
      options: {
        entry: ['entry.css'],
      },
    })

    expect(outputFiles).toContain('style.css')
    expect(outputFiles).toContain('entry.mjs')
    expect(fileMap['style.css']).toContain('background: #fff')
  })

  test('regression: missing @import fails build', async (context) => {
    // Source: esbuild TestCSSAtImportMissing
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L31
    await expect(
      testBuild({
        context,
        files: {
          'entry.css': `@import './missing.css';`,
        },
        options: {
          entry: ['entry.css'],
        },
        snapshot: false,
      }),
    ).rejects.toThrow(/missing\.css|Could not resolve/i)
  })

  test('regression: @import chain is bundled and inlined', async (context) => {
    // Source: esbuild TestCSSAtImport
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L99
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `@import './a.css'; @import './b.css'; .entry { color: red; }`,
        'a.css': `@import './shared.css'; .a { color: green; }`,
        'b.css': `@import './shared.css'; .b { color: blue; }`,
        'shared.css': `.shared { color: black; }`,
      },
      options: {
        entry: ['entry.css'],
      },
    })

    const cssFile = getCssFileName(outputFiles, 'entry.css')
    const css = fileMap[cssFile]

    expect(css).toContain('.shared')
    expect(css).toContain('.a')
    expect(css).toContain('.b')
    expect(css).toContain('.entry')
    expect(css).not.toContain('@import')
  })

  test.fails(
    'spec-gap: external http @import remains in output',
    async (context) => {
      // Source: esbuild TestCSSAtImportExternal
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L48
      const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `
          @import "https://example.com/external.css";
          @import './local.css';
        `,
        'local.css': `.local { color: green; }`,
      },
      options: {
        entry: ['entry.css'],
      },
    })

      const cssFile = getCssFileName(outputFiles, 'entry.css')
      const css = fileMap[cssFile]

      expect(css).toContain('https://example.com/external.css')
      expect(css).toContain('.local')
    },
  )
})
