import { browserslistToTargets } from 'lightningcss'
import { expect, test } from 'vitest'
import { esbuildTargetToLightningCSS } from './lightningcss.ts'

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
