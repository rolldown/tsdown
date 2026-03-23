import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('css', () => {
  test('basic', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.css'`,
        'foo.css': `body { color: red }`,
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
    expect(outputFiles).toEqual(['style.css'])
  })

  test('with splitting=true', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.css'`,
        'foo.css': `body { color: red }`,
      },
      options: {
        css: {
          splitting: true,
        },
      },
    })
    expect(outputFiles).toEqual(['index.css', 'index.mjs'])
  })

  test('with dts=true and splitting=true', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.css'`,
        'foo.css': `body { color: red }`,
      },
      options: {
        entry: ['index.ts'],
        dts: true,
        css: {
          splitting: true,
        },
      },
    })
    expect(outputFiles).toEqual(['index.css', 'index.d.mts', 'index.mjs'])
  })

  test('with sass and splitting=true', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.scss'`,
        'foo.scss': `$color: blue; body { color: $color; }`,
      },
      options: {
        entry: ['index.ts'],
        css: {
          splitting: true,
        },
      },
    })
    expect(outputFiles).toEqual(['index.css', 'index.mjs'])
  })

  test('sass resolves node_modules packages', async (context) => {
    const { outputFiles, snapshot } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.scss'`,
        'foo.scss': `@use '@my-lib/styles/vars';\nbody { color: vars.$primary; }`,
        'node_modules/@my-lib/styles/vars.scss': `$primary: #ff0000;`,
        'node_modules/@my-lib/styles/package.json': `{"name":"@my-lib/styles","main":"index.js"}`,
      },
      options: {
        entry: ['index.ts'],
        css: {
          splitting: true,
        },
      },
    })
    expect(outputFiles).toEqual(['index.css', 'index.mjs'])
    expect(snapshot).toContain('#ff0000')
  })

  test('sass preserves data URIs in node_modules', async (context) => {
    const { outputFiles, snapshot } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.scss'`,
        'foo.scss': `@use '@my-lib/styles/icons';`,
        'node_modules/@my-lib/styles/icons.scss': `.icon { --bg: url("data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E"); }`,
        'node_modules/@my-lib/styles/package.json': `{"name":"@my-lib/styles","main":"index.js"}`,
      },
      options: {
        entry: ['index.ts'],
        css: {
          splitting: true,
        },
      },
    })
    expect(outputFiles).toEqual(['index.css', 'index.mjs'])
    expect(snapshot).toContain('data:image/svg+xml')
    expect(snapshot).not.toContain('node_modules')
  })

  test('with sass and dts=true and splitting=true', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './foo.scss'`,
        'foo.scss': `$color: blue; body { color: $color; }`,
      },
      options: {
        entry: ['index.ts'],
        dts: true,
        css: {
          splitting: true,
        },
      },
    })
    expect(outputFiles).toEqual(['index.css', 'index.d.mts', 'index.mjs'])
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
          transformer: 'postcss',
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
      options: {
        css: { transformer: 'postcss' },
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
        'style.css': `@import './other.css'; @import 'my-awesome-lib/lib.css'; .main { color: red }`,
        'other.css': `.other { color: blue }`,
        'node_modules/my-awesome-lib/lib.css': `.lib { color: green }`,
        'node_modules/my-awesome-lib/package.json': JSON.stringify({
          name: 'my-awesome-lib',
          exports: { './lib.css': './lib.css' },
        }),
      },
      options: {
        css: {
          transformer: 'postcss',
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
    expect(fileMap['style.css']).toContain('.lib')
    expect(fileMap['style.css']).toContain('.main')
    expect(fileMap['style.css']).not.toContain('@import')
  })

  test('lightningcss inlines @import (default)', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `@import './other.css'; @import 'my-awesome-lib/lib.css'; .main { color: red }`,
        'other.css': `.other { color: blue }`,
        'node_modules/my-awesome-lib/lib.css': `.lib { color: green }`,
        'node_modules/my-awesome-lib/package.json': JSON.stringify({
          name: 'my-awesome-lib',
          exports: { './lib.css': './lib.css' },
        }),
      },
    })
    expect(fileMap['style.css']).toContain('.other')
    expect(fileMap['style.css']).toContain('.lib')
    expect(fileMap['style.css']).toContain('.main')
    expect(fileMap['style.css']).not.toContain('@import')
  })

  test('lightningcss ignores postcss plugins', async (context) => {
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

  test('handle .css?raw with unplugin-raw', async (context) => {
    const raw = await import('unplugin-raw/rolldown')

    const { fileMap, outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import cssText from './foo.css?raw'; console.log(cssText);`,
        'foo.css': `.foo{color:red;}`,
      },
      options: {
        entry: ['index.ts'],
        plugins: [raw.default({})],
      },
    })
    expect(outputFiles).toEqual(['index.mjs'])
    expect(fileMap['index.mjs']).toContain(`.foo{color:red;}`)
  })

  test('handle .css?inline', async (context) => {
    const { fileMap, outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import css from './foo.css?inline'; console.log(css);`,
        'foo.css': `.foo { color: red; }`,
      },
    })
    expect(outputFiles).toEqual(['index.mjs'])
    expect(fileMap['index.mjs']).toContain('.foo')
    expect(fileMap['index.mjs']).toContain('color')
  })

  test('handle .scss?inline', async (context) => {
    const { fileMap, outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import css from './foo.scss?inline'; console.log(css);`,
        'foo.scss': `$color: red; .foo { color: $color; }`,
      },
    })
    expect(outputFiles).toEqual(['index.mjs'])
    // Verify SCSS was actually compiled (no $color variable in output)
    expect(fileMap['index.mjs']).not.toContain('$color')
    expect(fileMap['index.mjs']).toContain('color: red')
  })

  test('css?inline alongside regular css import', async (context) => {
    const { fileMap, outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './bar.css'; import css from './foo.css?inline'; console.log(css);`,
        'foo.css': `.foo { color: red; }`,
        'bar.css': `.bar { color: blue; }`,
      },
    })
    expect(outputFiles).toContain('style.css')
    expect(outputFiles).toContain('index.mjs')
    expect(fileMap['style.css']).toContain('.bar')
    expect(fileMap['style.css']).not.toContain('.foo')
    expect(fileMap['index.mjs']).toContain('.foo')
  })

  describe('@import bundling', () => {
    test('diamond dependency graph', async (context) => {
      // From esbuild TestCSSAtImport
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L99
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `
            @import "./a.css";
            @import "./b.css";
            .entry { color: red }
          `,
          'a.css': `
            @import "./shared.css";
            .a { color: green }
          `,
          'b.css': `
            @import "./shared.css";
            .b { color: blue }
          `,
          'shared.css': `
            .shared { color: black }
          `,
        },
        options: { entry: ['entry.css'], css: { splitting: true } },
      })
      expect(fileMap['entry.css']).toContain('.shared')
      expect(fileMap['entry.css']).toContain('.a')
      expect(fileMap['entry.css']).toContain('.b')
      expect(fileMap['entry.css']).toContain('.entry')
      expect(fileMap['entry.css']).not.toContain('@import')
    })

    test('shared dependency appears only once', async (context) => {
      // From esbuild TestCSSAtImport
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L99
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `
            @import "./a.css";
            @import "./b.css";
          `,
          'a.css': `@import "./shared.css"; .a { color: green }`,
          'b.css': `@import "./shared.css"; .b { color: blue }`,
          'shared.css': `.shared { color: black }`,
        },
        options: { entry: ['entry.css'], css: { splitting: true } },
      })
      const css = fileMap['entry.css']
      const matches = css.match(/\.shared/g)
      expect(matches).toHaveLength(1)
    })
  })

  describe('@import duplicates', () => {
    test('duplicate import - last wins', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo duplicates/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1662
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css"); @import url("b.css"); @import url("a.css");`,
          'a.css': `.box { background-color: green; }`,
          'b.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).not.toContain('@import')
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
    })

    test('many duplicate imports', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo duplicates/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1666
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css"); @import url("b.css"); @import url("a.css"); @import url("b.css"); @import url("a.css");`,
          'a.css': `.box { background-color: green; }`,
          'b.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('@import cycles', () => {
    test('self-import', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo cycles/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1615
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("style.css"); .box { background-color: green; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
    })

    test('two-file cycle', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo cycles/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1621
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css");`,
          'a.css': `@import url("red.css"); @import url("b.css");`,
          'b.css': `@import url("green.css"); @import url("a.css");`,
          'green.css': `.box { background-color: green; }`,
          'red.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
    })

    test('cycle with both files having rules', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo cycles/003
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1625
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css");`,
          'a.css': `@import url("b.css"); .box { background-color: green; }`,
          'b.css': `@import url("a.css"); .box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
    })

    test('cycle resolved by import order', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo cycles/004
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1629
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css"); @import url("b.css");`,
          'a.css': `@import url("b.css"); .box { background-color: red; }`,
          'b.css': `@import url("a.css"); .box { background-color: green; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
    })

    test('cycle with triple import', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo cycles/005
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1633
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css"); @import url("b.css"); @import url("a.css");`,
          'a.css': `@import url("b.css"); .box { background-color: green; }`,
          'b.css': `@import url("a.css"); .box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
    })

    test('three-file cycle', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo cycles/006
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1640
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("b.css"); @import url("c.css");`,
          'a.css': `@import url("red.css"); @import url("b.css");`,
          'b.css': `@import url("green.css"); @import url("a.css");`,
          'c.css': `@import url("a.css");`,
          'green.css': `.box { background-color: green; }`,
          'red.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
    })
  })

  describe('@import relative paths', () => {
    test('relative path across directories', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo relative-paths/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1673
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./a/a.css");`,
          'a/a.css': `@import url("../b/b.css");`,
          'b/b.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })

    test('relative path with parent traversal', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo relative-paths/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1677
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./a/a.css");`,
          'a/a.css': `@import url("./../b/b.css");`,
          'b/b.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('@import conditions', () => {
    test('external import with media condition preserved', async (context) => {
      // From esbuild TestCSSAtImportConditionsBundleExternal
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1353
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `@import "https://example.com/print.css" print;`,
        },
        options: {
          entry: ['entry.css'],
          css: { splitting: true, transformer: 'postcss' },
        },
      })
      expect(fileMap['entry.css']).toContain('https://example.com/print.css')
      expect(fileMap['entry.css']).toContain('print')
    })

    test('@import with media condition', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-media/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1550
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") screen;`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('@media')
      expect(fileMap['style.css']).toContain('screen')
    })

    test('@import with media condition - two files', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-media/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1554
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") screen; @import url("b.css") print;`,
          'a.css': `.box { background-color: green; }`,
          'b.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('screen')
      expect(fileMap['style.css']).toContain('print')
    })

    test('@import with nested media conditions', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-media/003
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1558
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") screen;`,
          'a.css': `@import url("b.css") (min-width: 1px);`,
          'b.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
    })

    test('@import with supports condition', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-supports/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1590
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") supports(display: block);`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('@supports')
    })

    test('@import with nested supports conditions', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-supports/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1594
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") supports(display: block);`,
          'a.css': `@import url("b.css") supports(width: 10px);`,
          'b.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
    })

    test('@import with layer condition', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-layer/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1496
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `
            @import url("a.css") layer(a);
            @import url("b.css") layer(b);
            @import url("a.css") layer(a);
          `,
          'a.css': `.box { background-color: red; }`,
          'b.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('layer')
      expect(fileMap['style.css']).not.toContain('@import')
    })

    test.fails('@import with layer and media combined', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-layer/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1504
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `
            @import url("a.css") layer(a) print;
            @import url("b.css") layer(b);
            @import url("a.css") layer(a);
          `,
          'a.css': `.box { background-color: green; }`,
          'b.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('layer')
      expect(fileMap['style.css']).toContain('print')
    })
  })

  describe('@layer', () => {
    test('@layer declarations before @import', async (context) => {
      // From esbuild TestCSSAtLayerBeforeImportBundle
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2517
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `
            @layer layer1, layer2.layer3;
            @import "a.css";
            @import "b.css";
            @layer layer6.layer7, layer8;
          `,
          'a.css': `
            @layer layer4 {
              a { color: red }
            }
          `,
          'b.css': `
            @layer layer5 {
              b { color: red }
            }
          `,
        },
        options: { entry: ['entry.css'], css: { splitting: true } },
      })
      expect(fileMap['entry.css']).toContain('layer1')
      expect(fileMap['entry.css']).toContain('layer4')
      expect(fileMap['entry.css']).toContain('layer5')
      expect(fileMap['entry.css']).not.toContain('@import')
    })

    test('@layer ordering without imports', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-layer/007
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1538
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `
            @layer foo {}
            @layer bar {}
            @layer bar { .box { background-color: green; } }
            @layer foo { .box { background-color: red; } }
          `,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('foo')
      expect(fileMap['style.css']).toContain('bar')
    })

    test('@import with anonymous layer', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-layer/008
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1547
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") layer;`,
          'a.css': `@import "b.css" layer; .box { background-color: green; }`,
          'b.css': `.box { background-color: red; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).toContain('red')
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('nesting lowering', () => {
    // From esbuild TestCSSNestingOldBrowser
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2118
    const nestingCases = [
      ['nested-@layer', `a { @layer base { color: red; } }`],
      ['nested-@media', `a { @media screen { color: red; } }`],
      ['nested-ampersand-twice', `a { &, & { color: red; } }`],
      ['nested-ampersand-first', `a { &, b { color: red; } }`],
      ['nested-attribute', `a { [href] { color: red; } }`],
      ['nested-colon', `a { :hover { color: red; } }`],
      ['nested-dot', `a { .cls { color: red; } }`],
      ['nested-greaterthan', `a { > b { color: red; } }`],
      ['nested-hash', `a { #id { color: red; } }`],
      ['nested-plus', `a { + b { color: red; } }`],
      ['nested-tilde', `a { ~ b { color: red; } }`],
    ] as const

    test.for(nestingCases)('nesting lowered: %s', async ([, css], context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './style.css'`,
          'style.css': css,
        },
        options: {
          css: { target: 'chrome90' },
        },
      })
      expect(fileMap['style.css']).toContain('color: red')
    })

    const toplevelCases = [
      ['toplevel-attribute', `[href] { color: red; }`],
      ['toplevel-colon', `:hover { color: red; }`],
      ['toplevel-dot', `.cls { color: red; }`],
      ['toplevel-hash', `#id { color: red; }`],
    ] as const

    test.for(toplevelCases)(
      'toplevel preserved: %s',
      async ([, css], context) => {
        const { fileMap } = await testBuild({
          context,
          files: {
            'index.ts': `import './style.css'`,
            'style.css': css,
          },
          options: {
            css: { target: 'chrome90' },
          },
        })
        expect(fileMap['style.css']).toContain('color: red')
      },
    )
  })

  describe('css entry point', () => {
    test('css file as sole entry', async (context) => {
      // From esbuild TestCSSEntryPoint
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L14
      const { fileMap, outputFiles } = await testBuild({
        context,
        files: {
          'entry.css': `
            body {
              background: white;
              color: black;
            }
          `,
        },
        options: { entry: ['entry.css'], css: { splitting: true } },
      })
      expect(outputFiles).toContain('entry.css')
      expect(fileMap['entry.css']).toContain('background')
      expect(fileMap['entry.css']).toContain('color')
    })

    test('multiple CSS entry points', async (context) => {
      // From esbuild TestCSSEntryPoint
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L14
      const { outputFiles } = await testBuild({
        context,
        files: {
          'a.css': `.a { color: red }`,
          'b.css': `.b { color: blue }`,
        },
        options: { entry: ['a.css', 'b.css'], css: { splitting: true } },
      })
      expect(outputFiles).toContain('a.css')
      expect(outputFiles).toContain('b.css')
    })
  })

  describe('@charset', () => {
    test('@charset in imported files', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-charset/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1482
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@charset "utf-8"; @import url("a.css"); @import url("b.css");`,
          'a.css': `@charset "utf-8"; .box { background-color: red; }`,
          'b.css': `@charset "utf-8"; .box { background-color: green; }`,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain('red')
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('@keyframes with import conditions', () => {
    test('@keyframes scoped by media condition', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo at-keyframes/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1492
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("a.css") screen; @import url("b.css") print;`,
          'a.css': `
            .box { animation: BOX; animation-duration: 0s; animation-fill-mode: both; }
            @keyframes BOX { 0%, 100% { background-color: green; } }
          `,
          'b.css': `
            .box { animation: BOX; animation-duration: 0s; animation-fill-mode: both; }
            @keyframes BOX { 0%, 100% { background-color: red; } }
          `,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('@keyframes')
      expect(fileMap['style.css']).toContain('screen')
      expect(fileMap['style.css']).toContain('print')
    })
  })

  describe('@import url format variants', () => {
    test('url() without quotes', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo url-format/001/default
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1699
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url(a.css);`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })

    test('url() with relative path', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo url-format/001/relative-url
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1702
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url(./a.css);`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })

    test('string import without url()', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo url-format/002/default
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1705
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import "a.css";`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })

    test('string import with relative path', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo url-format/002/relative-url
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1708
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import "./a.css";`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('empty css imports', () => {
    test('import empty css file', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo empty/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1669
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./empty.css"); .box { background-color: green; }`,
          'empty.css': ``,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('code splitting', () => {
    test('CSS and JS code splitting with shared modules', async (context) => {
      // From esbuild TestCSSAndJavaScriptCodeSplittingIssue1064
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2029
      const { outputFiles } = await testBuild({
        context,
        files: {
          'a.ts': `
            import shared from './shared'
            console.log(shared() + 1)
          `,
          'b.ts': `
            import shared from './shared'
            console.log(shared() + 2)
          `,
          'c.css': `
            @import "./shared.css";
            body { color: red }
          `,
          'd.css': `
            @import "./shared.css";
            body { color: blue }
          `,
          'shared.ts': `
            export default function() { return 3 }
          `,
          'shared.css': `
            body { background: black }
          `,
        },
        options: {
          entry: ['a.ts', 'b.ts', 'c.css', 'd.css'],
          css: { splitting: true },
        },
      })
      const jsFiles = outputFiles.filter((f) => f.endsWith('.mjs'))
      const cssFiles = outputFiles.filter((f) => f.endsWith('.css'))
      expect(jsFiles.length).toBeGreaterThanOrEqual(2)
      expect(cssFiles.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('external imports', () => {
    test('https imports preserved', async (context) => {
      // From esbuild TestCSSAtImportConditionsBundleExternal
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1353
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `
            @import "https://www.example.com/style1.css";
            @import "https://www.example.com/style2.css" print;
            .local { color: red }
          `,
        },
        options: { entry: ['style.css'], css: { transformer: 'postcss' } },
      })
      expect(fileMap['style.css']).toContain(
        'https://www.example.com/style1.css',
      )
      expect(fileMap['style.css']).toContain(
        'https://www.example.com/style2.css',
      )
      expect(fileMap['style.css']).toContain('.local')
    })
  })

  describe('@import url fragments', () => {
    // Fails: Lightning CSS treats URL fragments as part of the file path,
    // causing ENOENT errors (e.g. tries to read `./a.css#foo` as a file).
    test.fails('import with hash fragment', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo url-fragments/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1717
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./a.css#foo");`,
          'a.css': `.box { background-color: green; }`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('green')
    })

    // Fails: Lightning CSS treats URL fragments as part of the file path.
    test.fails(
      'duplicate imports with different fragments',
      async (context) => {
        // From esbuild TestCSSAtImportConditionsFromExternalRepo url-fragments/002
        // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1721
        const { fileMap } = await testBuild({
          context,
          files: {
            'style.css': `@import url("./a.css#1"); @import url("./b.css#2"); @import url("./a.css#3");`,
            'a.css': `.box { background-color: green; }`,
            'b.css': `.box { background-color: red; }`,
          },
          options: { entry: ['style.css'] },
        })
        expect(fileMap['style.css']).toContain('green')
        expect(fileMap['style.css']).toContain('red')
      },
    )
  })

  describe('case insensitivity', () => {
    test('@IMPORT and LAYER are case insensitive', async (context) => {
      // From esbuild TestCSSCaseInsensitivity
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2579
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `@IMPORT Url("nested.css") LAYER(layer-name);`,
          'nested.css': `
            @KeyFrames Foo {
              froM { OPAcity: 0 }
              tO { opaCITY: 1 }
            }
            body {
              BACKGROUND-color: #FF0000;
            }
          `,
        },
        options: { entry: ['entry.css'], css: { splitting: true } },
      })
      expect(fileMap['entry.css']).not.toContain('@IMPORT')
      expect(fileMap['entry.css']).toContain('layer')
    })
  })

  describe('rule deduplication', () => {
    // From esbuild TestDeduplicateRules
    // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L2261
    test('duplicate declarations in same rule', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `a { color: red; color: green; color: red }`,
        },
        options: {
          entry: ['style.css'],
          css: { minify: true },
        },
      })
      expect(fileMap['style.css']).toContain('color')
    })

    test('duplicate rules', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `a { color: red } a { color: green } a { color: red }`,
        },
        options: {
          entry: ['style.css'],
          css: { minify: true },
        },
      })
      expect(fileMap['style.css']).toContain('color')
    })

    test('duplicate @media rules', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@media screen { a { color: red } } @media screen { a { color: red } }`,
        },
        options: {
          entry: ['style.css'],
          css: { minify: true },
        },
      })
      expect(fileMap['style.css']).toContain('color')
    })

    test('deduplication across files', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import 'a.css'; @import 'b.css'; @import 'c.css';`,
          'a.css': `a { color: red; color: red }`,
          'b.css': `a { color: green }`,
          'c.css': `a { color: red }`,
        },
        options: {
          entry: ['style.css'],
          css: { minify: true },
        },
      })
      expect(fileMap['style.css']).not.toContain('@import')
    })
  })

  describe('@import with @layer advanced', () => {
    test('layer wrapping on import', async (context) => {
      // From esbuild TestCSSAtImportConditionsAtLayerBundle
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1808
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `
            @import url(foo.css) layer(first.one);
            @import url(foo.css) layer(last.one);
            @import url(foo.css) layer(first.one);
          `,
          'foo.css': `body { color: red }`,
        },
        options: {
          entry: ['entry.css'],
          css: { splitting: true, transformer: 'postcss' },
        },
      })
      expect(fileMap['entry.css']).toContain('first')
      expect(fileMap['entry.css']).toContain('last')
      expect(fileMap['entry.css']).not.toContain('@import')
    })
  })

  describe('subresource url rebasing', () => {
    test('url() in nested directory import', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo subresource/004
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1687
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./styles/green.css");`,
          'styles/green.css': `.box { background-image: url("green.png"); }`,
          'styles/green.png': `...`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('.box')
      expect(fileMap['style.css']).toContain('background-image')
      expect(fileMap['style.css']).toContain('url(')
    })

    test('url() with relative ./ in nested directory', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo subresource/005
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1691
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./styles/green.css");`,
          'styles/green.css': `.box { background-image: url("./green.png"); }`,
          'styles/green.png': `...`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('.box')
      expect(fileMap['style.css']).toContain('url(')
    })

    test('url() in same directory', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo subresource/007
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1696
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `.box { background-image: url("./green.png"); }`,
          'green.png': `...`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('url(')
    })

    test('url() with parent directory traversal', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo subresource/002
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1684
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./styles/green.css");`,
          'styles/green.css': `.box { background-image: url("../green.png"); }`,
          'green.png': `...`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('.box')
      expect(fileMap['style.css']).toContain('url(')
    })

    test('url() across deeply nested directories', async (context) => {
      // From esbuild TestCSSAtImportConditionsFromExternalRepo subresource/001
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1681
      const { fileMap } = await testBuild({
        context,
        files: {
          'style.css': `@import url("./something/styles/green.css");`,
          'something/styles/green.css': `.box { background-image: url("../images/green.png"); }`,
          'something/images/green.png': `...`,
        },
        options: { entry: ['style.css'] },
      })
      expect(fileMap['style.css']).toContain('.box')
      expect(fileMap['style.css']).toContain('url(')
    })
  })

  describe('css from js', () => {
    test('js entry imports css', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'entry.ts': `import "./entry.css"`,
          'entry.css': `.entry { color: red }`,
        },
        options: { entry: ['entry.ts'] },
      })
      expect(outputFiles).toContain('style.css')
      expect(fileMap['style.css']).toContain('.entry')
      expect(fileMap['style.css']).toContain('color: red')
    })

    test('js entry imports css with other code', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `
            import "./style.css"
            export const foo = 42
          `,
          'style.css': `.foo { color: blue }`,
        },
      })
      expect(outputFiles).toContain('index.mjs')
      expect(outputFiles).toContain('style.css')
      expect(fileMap['style.css']).toContain('.foo')
    })

    test('js entry imports multiple css files', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `
            import "./a.css"
            import "./b.css"
          `,
          'a.css': `.a { color: red }`,
          'b.css': `.b { color: blue }`,
        },
      })
      expect(fileMap['style.css']).toContain('.a')
      expect(fileMap['style.css']).toContain('.b')
    })
  })

  describe('css.inject', () => {
    test('preserves css import in js output', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './foo.css'\nexport const a = 1`,
          'foo.css': `body { color: red }`,
        },
        options: {
          css: { inject: true },
        },
      })
      expect(outputFiles).toContain('style.css')
      expect(outputFiles).toContain('index.mjs')
      expect(fileMap['index.mjs']).toContain("import './style.css'")
      expect(fileMap['index.mjs']).not.toContain('empty css')
    })

    test('with splitting=true', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './foo.css'\nexport const a = 1`,
          'foo.css': `body { color: red }`,
        },
        options: {
          css: { inject: true, splitting: true },
        },
      })
      expect(outputFiles).toContain('index.css')
      expect(outputFiles).toContain('index.mjs')
      expect(fileMap['index.mjs']).toContain("import './index.css'")
      expect(fileMap['index.mjs']).not.toContain('empty css')
    })

    test('multiple css imports', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './a.css'\nimport './b.css'\nexport const a = 1`,
          'a.css': `.a { color: red }`,
          'b.css': `.b { color: blue }`,
        },
        options: {
          css: { inject: true },
        },
      })
      expect(outputFiles).toContain('style.css')
      expect(fileMap['index.mjs']).toContain("import './style.css'")
      expect(fileMap['index.mjs']).not.toContain('empty css')
    })

    test('injects css import into async chunk with splitting=true', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `export const main = 1\nimport('./async')`,
          'async.ts': `import './async.css'\nexport const asyncValue = 2`,
          'async.css': `.async { color: red }`,
        },
        options: {
          css: {
            inject: true,
            splitting: true,
          },
        },
      })

      const asyncCss = outputFiles.find((file) => /^async-.*\.css$/.test(file))
      const asyncJs = outputFiles.find((file) => /^async-.*\.mjs$/.test(file))

      expect(asyncCss).toBeTruthy()
      expect(asyncJs).toBeTruthy()

      const asyncCode = fileMap[asyncJs!]
      expect(asyncCode).toContain(`import './${asyncCss}'`)
      expect(asyncCode).not.toContain('empty css')
    })

    test('rewrites shared css-only chunk imports to css files', async (context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts':
            `export const loadA = () => import('./async-a')\n` +
            `export const loadB = () => import('./async-b')`,
          'async-a.ts': `import './shared'\nimport './a.css'\nexport const a = 1`,
          'async-b.ts': `import './shared'\nexport const b = 2`,
          'shared.ts': `import './shared.css'`,
          'shared.css': `.shared { color: red }`,
          'a.css': `.a { color: blue }`,
        },
        options: {
          css: { inject: true, splitting: true },
        },
      })

      const asyncAJs = outputFiles.find((file) =>
        /^async-a-.*\.mjs$/.test(file),
      )
      const asyncAStyles = outputFiles.find((file) =>
        /^async-a-.*\.css$/.test(file),
      )
      const asyncBJs = outputFiles.find((file) =>
        /^async-b-.*\.mjs$/.test(file),
      )
      const sharedJs = outputFiles.find((file) => /^shared-.*\.mjs$/.test(file))
      const sharedStyles = outputFiles.find((file) =>
        /^shared-.*\.css$/.test(file),
      )

      expect(asyncAJs).toBeTruthy()
      expect(asyncAStyles).toBeTruthy()
      expect(asyncBJs).toBeTruthy()
      expect(sharedStyles).toBeTruthy()
      expect(sharedJs).toBeFalsy()

      const asyncACode = fileMap[asyncAJs!]
      const asyncBCode = fileMap[asyncBJs!]

      expect(asyncACode).toContain(`import './${asyncAStyles}'`)
      expect(asyncACode).toContain(`import "./${sharedStyles}"`)
      expect(asyncACode).not.toContain('.mjs"')

      expect(asyncBCode).toContain(`import "./${sharedStyles}"`)
      expect(asyncBCode).not.toContain('.mjs"')
    })
  })

  describe('css modules', () => {
    test('basic css module exports scoped class names', async (context) => {
      const { fileMap, outputFiles } = await testBuild({
        context,
        files: {
          'index.ts': `export { default as styles } from './app.module.css'`,
          'app.module.css': `.title { color: red }\n.content { font-size: 14px }`,
        },
        options: {
          css: { modules: { generateScopedName: 'mod_[local]' } },
        },
      })
      expect(outputFiles).toContain('style.css')
      expect(outputFiles).toContain('index.mjs')

      const js = fileMap['index.mjs']
      expect(js).toContain('export')
      expect(js).toContain('mod_title')
      expect(js).toContain('mod_content')

      const css = fileMap['style.css']
      expect(css).toContain('.mod_title')
      expect(css).toContain('.mod_content')
      expect(css).not.toMatch(/(?<!_)\.title\b/)
      expect(css).not.toMatch(/(?<!_)\.content\b/)
    })

    test('css module with modules=false disables scoping', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './app.module.css'`,
          'app.module.css': `.title { color: red }`,
        },
        options: {
          css: { modules: false },
        },
      })
      const css = fileMap['style.css']
      expect(css).toContain('.title')
    })

    test('non-module css is not affected', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './app.css'`,
          'app.css': `.title { color: red }`,
        },
      })
      const css = fileMap['style.css']
      expect(css).toContain('.title')
    })

    test('css module with splitting', async (context) => {
      const { fileMap, outputFiles } = await testBuild({
        context,
        files: {
          'index.ts': `export { default as styles } from './app.module.css'`,
          'app.module.css': `.title { color: red }`,
        },
        options: {
          css: {
            splitting: true,
            modules: { generateScopedName: 'mod_[local]' },
          },
        },
      })
      expect(outputFiles).toContain('index.css')
      expect(outputFiles).toContain('index.mjs')

      const js = fileMap['index.mjs']
      expect(js).toContain('mod_title')
    })

    test('css module supports class named default', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import styles from './app.module.css'\nconsole.log(styles.default)`,
          'app.module.css': `.default { color: red }`,
        },
        options: {
          css: {
            modules: { generateScopedName: 'design-system-[local]' },
          },
        },
        snapshot: true,
      })

      const js = fileMap['index.mjs']
      const css = fileMap['style.css']

      expect(js).not.toContain('export const default')
      expect(js).toMatch(/"default"\s*:\s*"design-system-default"/)
      expect(js).toContain('.default')
      expect(css).toContain('.design-system-default')
    })
  })
})
