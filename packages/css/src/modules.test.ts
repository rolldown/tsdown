import { describe, expect, test } from 'vitest'
import { modulesToEsm } from './modules.ts'

describe('modulesToEsm', () => {
  test('exports arbitrary module keys via aliased bindings', () => {
    const code = modulesToEsm({
      default: 'mod_default',
      title: 'mod_title',
      await: 'mod_await',
      'foo-bar': 'mod_foo_bar',
    })

    expect(code).toContain('const _key0 = "mod_title";')
    expect(code).toContain('export { _key0 as "title" };')
    expect(code).not.toContain('const _default = "mod_default";')
    expect(code).not.toContain('export { _default as "default" };')
    expect(code).toContain('const _key1 = "mod_await";')
    expect(code).toContain('export { _key1 as "await" };')
    expect(code).toContain('const _key2 = "mod_foo_bar";')
    expect(code).toContain('export { _key2 as "foo-bar" };')
    expect(code).toContain(
      'export default {"default":"mod_default","title":"mod_title","await":"mod_await","foo-bar":"mod_foo_bar"};',
    )
  })
})
