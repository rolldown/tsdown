import { expect, test } from 'vitest'
import { fn } from '../src'

test('fn', () => {
  expect(fn()).toBe('Hello, tsdown!')
})
