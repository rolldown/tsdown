import { describe, expect, test } from 'vitest'
import { toCssFileName } from './utils.ts'

describe('toCssFileName', () => {
  test.each([
    ['index.mjs', 'index.css'],
    ['foo/bar.cjs', 'foo/bar.css'],
    ['card.module.cjs', 'card.css'],
    // Chunks of preserved modules keep non-JS extensions in `[name]`
    ['card.css.cjs', 'card.css'],
    ['card.scss.mjs', 'card.css'],
    ['card.module.css.js', 'card.css'],
  ])('%s -> %s', (input, expected) => {
    expect(toCssFileName(input)).toBe(expected)
  })
})
