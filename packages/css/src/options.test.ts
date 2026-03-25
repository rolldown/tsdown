import { describe, expect, test } from 'vitest'
import { defaultCssBundleName, resolveCssOptions } from './options.ts'

describe('resolveCssOptions', () => {
  test('defaults', () => {
    const result = resolveCssOptions()
    expect(result).toEqual({
      transformer: 'lightningcss',
      splitting: false,
      fileName: defaultCssBundleName,
      minify: false,
      inject: false,
      modules: {},
      target: undefined,
      preprocessorOptions: undefined,
      lightningcss: undefined,
      postcss: undefined,
    })
  })

  test('inherits top-level target', () => {
    const result = resolveCssOptions({}, ['chrome100'])
    expect(result.target).toEqual(['chrome100'])
  })

  test('css.target overrides top-level target', () => {
    const result = resolveCssOptions({ target: 'safari16' }, ['chrome100'])
    expect(result.target).toEqual(['safari16'])
  })

  test('css.target with comma-separated values', () => {
    const result = resolveCssOptions({ target: 'chrome100,safari16' })
    expect(result.target).toEqual(['chrome100', 'safari16'])
  })

  test('css.target array', () => {
    const result = resolveCssOptions({ target: ['chrome100', 'safari16'] })
    expect(result.target).toEqual(['chrome100', 'safari16'])
  })

  test('css.target=false disables target', () => {
    const result = resolveCssOptions({ target: false }, ['chrome100'])
    expect(result.target).toBeUndefined()
  })

  test('modules defaults to empty object', () => {
    const result = resolveCssOptions()
    expect(result.modules).toEqual({})
  })

  test('modules=false disables CSS modules', () => {
    const result = resolveCssOptions({ modules: false })
    expect(result.modules).toBe(false)
  })

  test('modules config is passed through', () => {
    const result = resolveCssOptions({
      modules: { localsConvention: 'camelCase', hashPrefix: 'app' },
    })
    expect(result.modules).toEqual({
      localsConvention: 'camelCase',
      hashPrefix: 'app',
    })
  })

  test('splitting defaults to true when unbundle is true', () => {
    const result = resolveCssOptions({}, undefined, true)
    expect(result.splitting).toBe(true)
  })

  test('explicit splitting=false overrides unbundle default', () => {
    const result = resolveCssOptions({ splitting: false }, undefined, true)
    expect(result.splitting).toBe(false)
  })

  test('custom options are passed through', () => {
    const result = resolveCssOptions({
      transformer: 'postcss',
      splitting: true,
      fileName: 'custom.css',
      minify: true,
      inject: true,
      preprocessorOptions: { scss: { additionalData: '$x: 1;' } },
      lightningcss: { drafts: { customMedia: true } },
      postcss: { plugins: [] },
    })
    expect(result).toEqual({
      transformer: 'postcss',
      splitting: true,
      fileName: 'custom.css',
      minify: true,
      inject: true,
      modules: {},
      target: undefined,
      preprocessorOptions: { scss: { additionalData: '$x: 1;' } },
      lightningcss: { drafts: { customMedia: true } },
      postcss: { plugins: [] },
    })
  })
})
