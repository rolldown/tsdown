import { describe, expect, test } from 'vitest'
import { applyLocalsConvention, modulesToEsm } from './modules.ts'

describe('modulesToEsm', () => {
  test('exports arbitrary module keys via aliased bindings', () => {
    const code = modulesToEsm({
      default: 'mod_default',
      title: 'mod_title',
      await: 'mod_await',
      'foo-bar': 'mod_foo_bar',
    })

    expect(code).matchSnapshot()
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

describe('applyLocalsConvention', () => {
  test('camelCaseOnly exports only the camelized key', () => {
    const result = applyLocalsConvention(
      { 'foo-bar': 'a', baz: 'b' },
      'camelCaseOnly',
      'style.module.css',
    )
    expect(result).toEqual({ fooBar: 'a', baz: 'b' })
  })

  test('function convention maps each key through the callback', () => {
    const result = applyLocalsConvention(
      { 'foo-bar': 'a', baz: 'b' },
      (name) => name.toUpperCase(),
      'style.module.css',
    )
    expect(result).toEqual({ 'FOO-BAR': 'a', BAZ: 'b' })
  })

  test('function convention receives class name, scoped name, and filename', () => {
    const calls: Array<[string, string, string]> = []
    applyLocalsConvention(
      { 'foo-bar': 'scoped_foo_bar' },
      (original, generated, file) => {
        calls.push([original, generated, file])
        return original
      },
      'style.module.css',
    )
    expect(calls).toEqual([['foo-bar', 'scoped_foo_bar', 'style.module.css']])
  })
})
