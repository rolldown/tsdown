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

describe('css urls', () => {
  test.fails('spec-gap: missing url() assets fail build', async (context) => {
    // Source: esbuild TestMissingImportURLInCSS
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1049
    await expect(
      testBuild({
        context,
        files: {
          'entry.css': `
            a { background: url(./one.png); }
            b { background: url('./two.png'); }
          `,
        },
        options: {
          entry: ['entry.css'],
        },
        snapshot: false,
      }),
    ).rejects.toThrow(/one\.png|two\.png|Could not resolve/i)
  })

  test('regression: external-like urls are preserved', async (context) => {
    // Source: esbuild TestExternalImportURLInCSS
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1068
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `
          a { background: url(http://example.com/images/image.png) }
          b { background: url(https://example.com/images/image.png) }
          c { background: url(//example.com/images/image.png) }
          d { background: url(data:image/png;base64,iVBORw0KGgo=) }
          path { fill: url(#filter) }
          div { background: url('./local.png') }
        `,
        'local.png': '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A',
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

    expect(css).toContain('http://example.com/images/image.png')
    expect(css).toContain('https://example.com/images/image.png')
    expect(css).toContain('//example.com/images/image.png')
    expect(css).toContain('data:image/png;base64,iVBORw0KGgo=')
    expect(css).toContain('url("#filter")')
  })

  test.fails(
    'spec-gap: invalid url() targets fail when pointing to code files',
    async (context) => {
      // Source: esbuild TestInvalidImportURLInCSS
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1098
      await expect(
        testBuild({
          context,
          files: {
            'entry.css': `
              a {
                background: url(./js.js);
                background: url('./ts.ts');
                background: url('./json.json');
                background: url('./css.css');
              }
            `,
            'js.js': `export default 123`,
            'ts.ts': `export default 123`,
            'json.json': `{ "test": true }`,
            'css.css': `a { color: red; }`,
          },
          options: {
            entry: ['entry.css'],
          },
          snapshot: false,
        }),
      ).rejects.toThrow(/url|loader|css|js|json/i)
    },
  )

  test.fails('spec-gap: text loader works for url() in css', async (context) => {
    // Source: esbuild TestTextImportURLInCSSText
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1139
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `a { background: url(./example.txt); }`,
        'example.txt': `This is some text.`,
      },
      options: {
        entry: ['entry.css'],
        loader: {
          '.txt': 'text',
        },
      },
    })

    const cssFile = getCssFileName(outputFiles, 'entry.css')
    const css = fileMap[cssFile]

    expect(css).not.toContain('./example.txt')
    expect(css).toContain('url(')
  })

  test.fails('spec-gap: dataurl loader works for url() in css', async (context) => {
    // Source: esbuild TestDataURLImportURLInCSS
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1157
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `a { background: url(./example.png); }`,
        'example.png': '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A',
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
  })

  test.fails('spec-gap: binary loader works for url() in css', async (context) => {
    // Source: esbuild TestBinaryImportURLInCSS
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1179
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `a { background: url(./example.bin); }`,
        'example.bin': '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A',
      },
      options: {
        entry: ['entry.css'],
        loader: {
          '.bin': 'binary',
        },
      },
    })

    const cssFile = getCssFileName(outputFiles, 'entry.css')
    const css = fileMap[cssFile]

    expect(css).toContain('url(')
    expect(css).not.toContain('./example.bin')
  })

  test.fails('spec-gap: base64 loader works for url() in css', async (context) => {
    // Source: esbuild TestBase64ImportURLInCSS
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1201
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `a { background: url(./example.b64); }`,
        'example.b64': '\x89\x50\x4E\x47\x0D\x0A\x1A\x0A',
      },
      options: {
        entry: ['entry.css'],
        loader: {
          '.b64': 'base64',
        },
      },
    })

    const cssFile = getCssFileName(outputFiles, 'entry.css')
    const css = fileMap[cssFile]

    expect(css).toContain('url(')
    expect(css).not.toContain('./example.b64')
  })

  test.fails(
    'spec-gap: asset loader keeps shared file referenced by css imports',
    async (context) => {
      // Source: esbuild TestFileImportURLInCSS
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1223
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `@import './one.css'; @import './two.css';`,
          'one.css': `a { background: url(./example.data) }`,
          'two.css': `b { background: url(./example.data) }`,
          'example.data': 'This is some data.',
        },
        options: {
          entry: ['entry.css'],
          loader: {
            '.data': 'asset',
          },
        },
      })

      const cssFile = getCssFileName(outputFiles, 'entry.css')
      const css = fileMap[cssFile]

      expect(css).toContain('url(')
      expect(css).not.toContain('./example.data')
      expect(outputFiles.some((file) => file.endsWith('.data'))).toBe(true)
    },
  )

  test.fails(
    'spec-gap: query/hash urls fail without matching support',
    async (context) => {
      // Source: esbuild TestCSSExternalQueryAndHashNoMatchIssue1822
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2070
      await expect(
        testBuild({
          context,
          files: {
            'entry.css': `
              a { background: url(foo/bar.png?baz) }
              b { background: url(foo/bar.png#baz) }
            `,
          },
          options: {
            entry: ['entry.css'],
          },
          snapshot: false,
        }),
      ).rejects.toThrow(/bar\.png\?baz|bar\.png#baz|Could not resolve/i)
    },
  )

  test('regression: query/hash urls are preserved for external http urls', async (context) => {
    // Source: esbuild TestCSSExternalQueryAndHashMatchIssue1822
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2096
    const { outputFiles, fileMap } = await testBuild({
      context,
      files: {
        'entry.css': `
          a { background: url(https://example.com/foo/bar.png?baz) }
          b { background: url(https://example.com/foo/bar.png#baz) }
        `,
      },
      options: {
        entry: ['entry.css'],
      },
    })

    const cssFile = getCssFileName(outputFiles, 'entry.css')
    const css = fileMap[cssFile]

    expect(css).toContain('https://example.com/foo/bar.png?baz')
    expect(css).toContain('https://example.com/foo/bar.png#baz')
  })
})
