import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('css', () => {
  test('basic', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `body { color: red }`,
      },
    })
    expect(outputFiles).toEqual(['index.mjs', 'style.css'])
  })

  test('unbundle', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `body { color: red }`,
      },
      options: {
        unbundle: true,
      },
    })
    expect(outputFiles).toEqual(['index.mjs', 'style.css'])
  })

  test('with dts', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'style.css': `body { color: red }`,
      },
      options: {
        entry: ['style.css'],
        dts: true,
      },
    })
    expect(outputFiles).toEqual(['style.css', 'style.mjs'])
  })

  test.for([true, false])(
    'merge css with splitting=%s',
    async (splitting, context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `
          import './style.css'
          export const loadAsync = () => import('./async')
        `,
          'style.css': `body { color: red }`,
          'async.ts': `import './async.css'`,
          'async.css': `.async { color: blue }`,
        },
        options: {
          css: {
            splitting,
            fileName: 'index.css',
          },
        },
      })

      const cssFiles = outputFiles.filter((f) => f.endsWith('.css'))
      expect(fileMap['index.css']).toContain('color: red')
      if (splitting) {
        expect(cssFiles).toHaveLength(2)
        expect(cssFiles).toContain('index.css')
      } else {
        expect(cssFiles).toEqual(['index.css'])
        expect(fileMap['index.css']).toContain('.async')
      }
    },
  )

  test('css.minify option accepted', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { color: red }`,
      },
      options: {
        css: { minify: true },
      },
    })
    expect(outputFiles).toContain('style.css')
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
        css: { splitting: true },
      },
    })
    expect(outputFiles).toContain('bar.css')
    expect(outputFiles).toContain('foo.css')
  })

  test('css syntax lowering', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { & .bar { color: red } }`,
      },
      options: {
        css: { target: 'chrome90' },
      },
    })
    expect(fileMap['style.css']).toContain('.foo .bar')
    expect(fileMap['style.css']).not.toContain('&')
  })

  test('unnecessary css syntax lowering', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { & .bar { color: red } }`,
      },
      options: {
        css: { target: 'chrome120' },
      },
    })
    expect(fileMap['style.css']).toContain('& .bar')
  })

  test('target=false with CSS preserves modern syntax', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { & .bar { color: red } }`,
      },
      options: {
        target: 'chrome90',
        css: { target: false },
      },
    })
    expect(fileMap['style.css']).toContain('& .bar')
  })

  test('inlines @import', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `@import './other.css'; .main { color: red }`,
        'other.css': `.other { color: blue }`,
      },
    })
    expect(fileMap['style.css']).toContain('.other')
    expect(fileMap['style.css']).toContain('.main')
    expect(fileMap['style.css']).not.toContain('@import')
  })

  test('deep @import chain', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './a.css'`,
        'a.css': `@import './b.css'; .a { color: red }`,
        'b.css': `@import './c.css'; .b { color: green }`,
        'c.css': `.c { color: blue }`,
      },
    })
    expect(fileMap['style.css']).toContain('.a')
    expect(fileMap['style.css']).toContain('.b')
    expect(fileMap['style.css']).toContain('.c')
    expect(fileMap['style.css']).not.toContain('@import')
  })

  test('empty css file', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': ``,
      },
    })
    expect(outputFiles).toContain('index.mjs')
  })

  test('postcss with inline plugin', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { color: red }`,
      },
      options: {
        css: {
          postcss: {
            plugins: [
              {
                postcssPlugin: 'test-plugin',
                Once(root: any) {
                  root.prepend({ text: 'postcss-processed' })
                },
              },
            ],
          },
        },
      },
    })
    expect(fileMap['style.css']).toContain('postcss-processed')
    expect(fileMap['style.css']).toContain('.foo')
  })

  test('postcss with config file', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { color: red }`,
        'postcss.config.cjs': `
          module.exports = {
            plugins: [
              {
                postcssPlugin: 'test-plugin',
                Once(root) {
                  root.prepend({ text: 'from-config-file' })
                },
              },
            ],
          }
        `,
      },
    })
    expect(fileMap['style.css']).toContain('from-config-file')
    expect(fileMap['style.css']).toContain('.foo')
  })

  test('postcss with @import', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `@import './other.css'; .main { color: red }`,
        'other.css': `.other { color: blue }`,
      },
      options: {
        css: {
          postcss: {
            plugins: [
              {
                postcssPlugin: 'test-plugin',
                Once(root: any) {
                  root.prepend({ text: 'postcss-processed' })
                },
              },
            ],
          },
        },
      },
    })
    expect(fileMap['style.css']).toContain('postcss-processed')
    expect(fileMap['style.css']).toContain('.other')
    expect(fileMap['style.css']).toContain('.main')
    expect(fileMap['style.css']).not.toContain('@import')
  })

  test('lightningcss transformer inlines @import', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `@import './other.css'; .main { color: red }`,
        'other.css': `.other { color: blue }`,
      },
      options: {
        css: { transformer: 'lightningcss' },
      },
    })
    expect(fileMap['style.css']).toContain('.other')
    expect(fileMap['style.css']).toContain('.main')
    expect(fileMap['style.css']).not.toContain('@import')
  })

  test('lightningcss transformer ignores postcss plugins', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `.foo { color: red }`,
      },
      options: {
        css: {
          transformer: 'lightningcss',
          postcss: {
            plugins: [
              {
                postcssPlugin: 'test-plugin',
                Once(root: any) {
                  root.prepend({ text: 'should-not-appear' })
                },
              },
            ],
          },
        },
      },
    })
    expect(fileMap['style.css']).toContain('.foo')
    expect(fileMap['style.css']).not.toContain('should-not-appear')
  })
})
