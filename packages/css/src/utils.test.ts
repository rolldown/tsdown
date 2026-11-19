import { describe, expect, test } from 'vitest'
import { cssChunkImportRE, toCssFileName } from './utils.ts'

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

describe('cssChunkImportRE', () => {
  const rewrite = (
    code: string,
    format: Parameters<typeof cssChunkImportRE>[1],
  ) =>
    code.replace(
      cssChunkImportRE('shared-a.b.cjs', format),
      '$1shared-a.b.css$2',
    )

  test.each([
    ['import "./shared-a.b.cjs";', 'es', 'import "./shared-a.b.css";'],
    ['require("./shared-a.b.cjs");', 'cjs', 'require("./shared-a.b.css");'],
    ["require('./shared-a.b.cjs'),", 'cjs', "require('./shared-a.b.css'),"],
    ['require(`./shared-a.b.cjs`);', 'cjs', 'require(`./shared-a.b.css`);'],
    ['require("./shared-a.b.cjs");', 'umd', 'require("./shared-a.b.css");'],
    // ESM output only matches import statements, and vice versa
    ['require("./shared-a.b.cjs");', 'es', 'require("./shared-a.b.cjs");'],
    ['import "./shared-a.b.cjs";', 'cjs', 'import "./shared-a.b.cjs";'],
    // `.` in the file name is escaped
    ['require("./shared-aXb.cjs");', 'cjs', 'require("./shared-aXb.cjs");'],
  ] as const)('%s (%s)', (code, format, expected) => {
    expect(rewrite(code, format)).toBe(expected)
  })
})
