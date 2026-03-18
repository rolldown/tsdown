import { describe, expect, test } from 'vitest'
import { modulesToEsm } from './modules.ts'

describe('modulesToEsm', () => {
  test('skips reserved words from named exports', () => {
    const code = modulesToEsm({
      default: 'mod_default',
      title: 'mod_title',
      await: 'mod_await',
      'foo-bar': 'mod_foo_bar',
    })
    expect(code).toContain('export const title = "mod_title";')
    expect(code).not.toContain('export const default')
    expect(code).not.toContain('export const await')
    expect(code).not.toContain('export const foo-bar')
    expect(code).toContain(
      'export default {"default":"mod_default","title":"mod_title","await":"mod_await","foo-bar":"mod_foo_bar"};',
    )
  })
})
