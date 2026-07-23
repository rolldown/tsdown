import { describe, expect, test } from 'vitest'
import {
  createConcurrencyExecutor,
  matchPattern,
  noop,
  resolveComma,
  resolveRegex,
  slash,
  toArray,
} from './general.ts'

describe('toArray', () => {
  test('wraps single value in array', () => {
    expect(toArray('foo')).toEqual(['foo'])
  })

  test('returns array as-is', () => {
    expect(toArray(['a', 'b'])).toEqual(['a', 'b'])
  })

  test('returns empty array for null', () => {
    expect(toArray(null)).toEqual([])
  })

  test('returns empty array for undefined', () => {
    expect(toArray(undefined)).toEqual([])
  })

  test('returns default value array for null with default', () => {
    expect(toArray(null, 'default')).toEqual(['default'])
  })

  test('returns default value array for undefined with default', () => {
    expect(toArray(undefined, 'default')).toEqual(['default'])
  })

  test('wraps number in array', () => {
    expect(toArray(42)).toEqual([42])
  })

  test('wraps false in array', () => {
    expect(toArray(false)).toEqual([false])
  })
})

describe('resolveComma', () => {
  test('splits comma-separated values', () => {
    expect(resolveComma(['esm,cjs'])).toEqual(['esm', 'cjs'])
  })

  test('handles values without commas', () => {
    expect(resolveComma(['esm', 'cjs'])).toEqual(['esm', 'cjs'])
  })

  test('handles mixed values', () => {
    expect(resolveComma(['esm,cjs', 'iife'])).toEqual(['esm', 'cjs', 'iife'])
  })

  test('handles empty array', () => {
    expect(resolveComma([])).toEqual([])
  })
})

describe('resolveRegex', () => {
  test('converts regex-like string to RegExp', () => {
    const result = resolveRegex('/foo/')
    expect(result).toBeInstanceOf(RegExp)
    expect((result as RegExp).source).toBe('foo')
  })

  test('returns non-regex string as-is', () => {
    expect(resolveRegex('foo')).toBe('foo')
  })

  test('returns non-string values as-is', () => {
    expect(resolveRegex(42)).toBe(42)
    expect(resolveRegex(null)).toBeNull()
  })

  test('does not convert string with only one slash', () => {
    expect(resolveRegex('/foo')).toBe('/foo')
  })

  test('does not convert short strings', () => {
    expect(resolveRegex('//')).toBe('//')
  })
})

describe('slash', () => {
  test('replaces backslashes with forward slashes', () => {
    expect(slash(String.raw`foo\bar\baz`)).toBe('foo/bar/baz')
  })

  test('leaves forward slashes unchanged', () => {
    expect(slash('foo/bar/baz')).toBe('foo/bar/baz')
  })

  test('handles empty string', () => {
    expect(slash('')).toBe('')
  })

  test('handles mixed slashes', () => {
    expect(slash(String.raw`foo\bar/baz`)).toBe('foo/bar/baz')
  })
})

describe('noop', () => {
  test('returns the input value unchanged', () => {
    expect(noop('hello')).toBe('hello')
    expect(noop(42)).toBe(42)
    expect(noop(null)).toBeNull()
  })
})

describe('matchPattern', () => {
  test('matches exact string', () => {
    expect(matchPattern('foo', ['foo'])).toBe(true)
  })

  test('does not match different string', () => {
    expect(matchPattern('foo', ['bar'])).toBe(false)
  })

  test('matches regex pattern', () => {
    expect(matchPattern('foo-bar', [/foo/])).toBe(true)
  })

  test('does not match failing regex', () => {
    expect(matchPattern('baz', [/foo/])).toBe(false)
  })

  test('matches glob pattern', () => {
    expect(matchPattern('src/utils/index.ts', ['src/**/*.ts'])).toBe(true)
  })

  test('does not match non-matching glob', () => {
    expect(matchPattern('src/utils/index.js', ['src/**/*.ts'])).toBe(false)
  })

  test('matches if any pattern matches', () => {
    expect(matchPattern('foo', ['bar', 'foo'])).toBe(true)
  })

  test('handles empty patterns array', () => {
    expect(matchPattern('foo', [])).toBe(false)
  })

  test('resets regex lastIndex between calls', () => {
    const regex = /foo/g
    regex.lastIndex = 5
    expect(matchPattern('foo', [regex])).toBe(true)
  })
})

describe('createConcurrencyExecutor', () => {
  test('requires a positive integer', () => {
    expect(() => createConcurrencyExecutor(0)).toThrow(
      '`--concurrency` must be a positive integer',
    )
    expect(() => createConcurrencyExecutor(1.5)).toThrow(
      '`--concurrency` must be a positive integer',
    )
  })

  test('limits concurrent tasks', async () => {
    const execute = createConcurrencyExecutor(2)
    let active = 0
    let maxActive = 0

    await Promise.all(
      Array.from({ length: 5 }, () =>
        execute(async () => {
          active++
          maxActive = Math.max(maxActive, active)
          await new Promise((resolve) => setTimeout(resolve, 10))
          active--
        }),
      ),
    )

    expect(maxActive).toBe(2)
  })

  test('preserves queue order', async () => {
    const execute = createConcurrencyExecutor(1)
    const order: number[] = []

    await Promise.all(
      [1, 2, 3].map((value) =>
        execute(() => {
          order.push(value)
          return Promise.resolve()
        }),
      ),
    )

    expect(order).toEqual([1, 2, 3])
  })

  test('releases a slot when a task rejects', async () => {
    const execute = createConcurrencyExecutor(1)
    const order: number[] = []

    const first = execute(() => {
      order.push(1)
      return Promise.reject(new Error('boom'))
    })
    const second = execute(() => {
      order.push(2)
      return Promise.resolve()
    })

    await expect(first).rejects.toThrow('boom')
    await second
    expect(order).toEqual([1, 2])
  })
})

describe('promiseWithResolvers', () => {
  test('returns a promise that resolves', async () => {
    const { promise, resolve } = Promise.withResolvers<string>()
    resolve('hello')
    expect(await promise).toBe('hello')
  })

  test('resolve is callable before awaiting', async () => {
    const { promise, resolve } = Promise.withResolvers<number>()
    resolve(42)
    await expect(promise).resolves.toBe(42)
  })
})
