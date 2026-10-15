import { describe, expect, test } from 'vitest'
import { getCleanId, shouldSkipTransform } from './utils.ts'

describe('shouldSkipTransform', () => {
  test.each([
    '/a/foo.css',
    '/a/foo.css?inline',
    '/a/foo.scss?inline',
    '/a/Comp.vue?vue&type=style&index=0&lang.css',
    '/a/Comp.vue?vue&type=style&index=0&lang.scss',
    '/a/Button.css?vue&type=style&index=0&src=abc&scoped=abc&lang.css',
    '/a/Button.scss?vue&type=style&index=0&src=true&lang.scss',
    '/a/B.module.css?vue&type=style&index=0&src=true&lang.module.css',
  ])('processes %s', (id) => {
    expect(shouldSkipTransform(id, getCleanId(id))).toBe(false)
  })

  test.each([
    '/a/foo.css?raw',
    '/a/foo.css?url',
    '/a/foo.css?bytes',
    '/a/foo.css?worker',
    '/a/foo.css?v=123',
    '/a/foo.css?raw&lang.css',
  ])('skips %s', (id) => {
    expect(shouldSkipTransform(id, getCleanId(id))).toBe(true)
  })
})
