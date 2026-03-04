import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

function getJsFileName(outputFiles: string[], preferred: string): string {
  if (outputFiles.includes(preferred)) return preferred
  const file = outputFiles.find((value) => value.endsWith('.mjs'))
  if (!file) {
    throw new Error('No JS file found in output files')
  }
  return file
}

describe('css spec gaps', () => {
  // Known gap: CSS Modules class-name export mapping is not yet stable/aligned
  // with esbuild-style local class export semantics.
  test.fails(
    'spec-gap: local css modules should export stable class names',
    async (context) => {
      // Source: esbuild TestImportLocalCSSFromJS
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L202
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'entry.ts': `import * as styles from './foo.module.css'; console.log(styles.foo)`,
          'foo.module.css': `.foo { color: red }`,
        },
        options: {
          entry: ['entry.ts'],
        },
      })

      const jsFile = getJsFileName(outputFiles, 'entry.mjs')
      expect(fileMap[jsFile]).toContain('foo_foo')
    },
  )

  // Known gap: `.local.css` vs `.global.css` treatment and JS import semantics are
  // not yet differentiated to match esbuild behavior.
  test.fails(
    'spec-gap: global-css and local-css should be differentiated',
    async (context) => {
      // Source: esbuild TestImportCSSFromJSLocalVsGlobal
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L335
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'entry.ts': `
          import * as local from './foo.local.css'
          import * as global from './bar.global.css'
          console.log(local.foo, global.bar)
        `,
          'foo.local.css': `.foo { color: red }`,
          'bar.global.css': `.bar { color: blue }`,
        },
        options: {
          entry: ['entry.ts'],
        },
      })

      const jsFile = getJsFileName(outputFiles, 'entry.mjs')
      expect(fileMap[jsFile]).toContain('foo_foo')
      expect(fileMap[jsFile]).not.toContain('global.bar')
    },
  )

  // Known gap: `composes: ... from` resolution across local CSS modules is not
  // implemented yet.
  test.fails(
    'spec-gap: composes-from should resolve local class composition',
    async (context) => {
      // Source: esbuild TestImportCSSFromJSComposes
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L663
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'entry.ts': `import * as styles from './a.local.css'; console.log(styles.a)`,
          'a.local.css': `.a { composes: b from './b.local.css'; color: red }`,
          'b.local.css': `.b { color: blue }`,
        },
        options: {
          entry: ['entry.ts'],
        },
      })

      const jsFile = getJsFileName(outputFiles, 'entry.mjs')
      expect(fileMap[jsFile]).toContain('a b')
    },
  )

  // Known gap: composes graph validation does not currently report circular
  // composition diagnostics.
  test.fails(
    'spec-gap: composes circular references should report diagnostics',
    async (context) => {
      // Source: esbuild TestImportCSSFromJSComposesFromCircular
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L859
      await expect(
        testBuild({
          context,
          files: {
            'entry.ts': `import './a.local.css'`,
            'a.local.css': `.a { composes: b from './b.local.css'; }`,
            'b.local.css': `.b { composes: a from './a.local.css'; }`,
          },
          options: {
            entry: ['entry.ts'],
          },
          snapshot: false,
        }),
      ).rejects.toThrow(/circular|composes/i)
    },
  )

  // Known gap: canonical `@layer` ordering synthesis for conditional @import
  // bundling is not yet preserved.
  test.fails(
    'spec-gap: @layer import conditions should preserve canonical ordering',
    async (context) => {
      // Source: esbuild TestCSSAtImportConditionsAtLayerBundle
      // https://github.com/evanw/esbuild/blob/v0.27.3/internal/bundler_tests/bundler_css_test.go#L1808
      const { fileMap } = await testBuild({
        context,
        files: {
          'entry.css': `
          @import './a.css' layer(base);
          @import './b.css' layer(theme) screen;
        `,
          'a.css': `.a { color: red }`,
          'b.css': `.b { color: blue }`,
        },
        options: {
          entry: ['entry.css'],
        },
      })

      expect(fileMap['entry.css']).toContain('@layer base, theme;')
    },
  )
})
