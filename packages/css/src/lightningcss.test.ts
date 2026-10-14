import path from 'node:path'
import { browserslistToTargets } from 'lightningcss'
import { expect, test } from 'vitest'
import { globalLogger } from '../../../src/utils/logger.ts'
import { writeFixtures } from '../../../tests/utils.ts'
import {
  bundleWithLightningCSS,
  esbuildTargetToLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'

test('esbuildTargetToLightningCSS', () => {
  const expected = browserslistToTargets([
    'chrome 99',
    'safari 16.2',
    'firefox 120.1.2',
  ])
  const actual = esbuildTargetToLightningCSS([
    // A browser version with only a major version.
    'chrome99',
    // A browser version with a major and minor version.
    'safari16.2 ' +
      // A browser version with a major, minor, and patch version.
      'firefox120.1.2',
    // No browser.
    'node12 es2021',
  ])

  expect(actual).toMatchInlineSnapshot(`
    {
      "chrome": 6488064,
      "firefox": 7864578,
      "safari": 1049088,
    }
  `)
  expect(actual).toEqual(expected)
})

test('transformWithLightningCSS returns a source map when requested', async () => {
  const result = await transformWithLightningCSS(
    'body { color: red }',
    'x.css',
    {
      minify: true,
      sourceMap: true,
    },
  )
  expect(result.map).toBeTypeOf('string')
  const map = JSON.parse(result.map!)
  expect(map.version).toBe(3)
  expect(map.mappings).toBeTruthy()
})

test('transformWithLightningCSS omits the map by default', async () => {
  const result = await transformWithLightningCSS(
    'body { color: red }',
    'x.css',
    {
      minify: true,
    },
  )
  expect(result.map).toBeUndefined()
})

test('bundleWithLightningCSS tracks @import-ed files as dependencies', async (context) => {
  const { testDir } = await writeFixtures(context, {
    'styles.css': `@import './partial.css';`,
    'partial.css': `body { color: red }`,
  })

  const result = await bundleWithLightningCSS(
    path.join(testDir, 'styles.css'),
    {
      logger: globalLogger,
    },
  )

  expect(result.deps).toContain(path.join(testDir, 'partial.css'))
})

const KEYFRAMES_CSS = `
  @keyframes fade-out {
    from { opacity: 1 }
    to { opacity: 0 }
  }
  .fade { animation: fade-out 2s ease-in-out }
`

function expectKeyframesNotRenamed(code: string) {
  expect(code).toContain('@keyframes fade-out')
  expect(code).not.toMatch(/@keyframes \S+_fade-out/)
}

test('transformWithLightningCSS respects lightningcss.cssModules.animation: false', async () => {
  const result = await transformWithLightningCSS(KEYFRAMES_CSS, 'styles.css', {
    cssModules: true,
    lightningcss: { cssModules: { animation: false } },
  })

  expectKeyframesNotRenamed(result.code)
  // CSS modules scoping still applies to class names.
  expect(result.code).not.toContain('.fade')
})

test('transformWithLightningCSS renames keyframes without animation: false', async () => {
  const result = await transformWithLightningCSS(KEYFRAMES_CSS, 'styles.css', {
    cssModules: true,
  })

  expect(result.code).not.toContain('@keyframes fade-out')
  expect(result.code).toMatch(/@keyframes \S+_fade-out/)
})

test('transformWithLightningCSS merges object-form cssModules configs', async () => {
  const result = await transformWithLightningCSS(KEYFRAMES_CSS, 'styles.css', {
    cssModules: { pattern: '[local]' },
    lightningcss: { cssModules: { animation: false } },
  })

  expectKeyframesNotRenamed(result.code)
  // `pattern: '[local]'` from `css.modules` object form is preserved.
  expect(result.code).toContain('.fade')
})

test('bundleWithLightningCSS respects lightningcss.cssModules.animation: false', async (context) => {
  const { testDir } = await writeFixtures(context, {
    'styles.css': KEYFRAMES_CSS,
  })

  const result = await bundleWithLightningCSS(
    path.join(testDir, 'styles.css'),
    {
      logger: globalLogger,
      cssModules: true,
      lightningcss: { cssModules: { animation: false } },
    },
  )

  expectKeyframesNotRenamed(result.code)
  expect(result.code).not.toContain('.fade')
})
