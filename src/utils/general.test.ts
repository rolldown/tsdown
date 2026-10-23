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
  test.each<[string, unknown, unknown, unknown[]]>([
    ['wraps single value in array', 'foo', undefined, ['foo']],
    ['returns array as-is', ['a', 'b'], undefined, ['a', 'b']],
    ['returns empty array for null', null, undefined, []],
    ['returns empty array for undefined', undefined, undefined, []],
    [
      'returns default value array for null with default',
      null,
      'default',
      ['default'],
    ],
    [
      'returns default value array for undefined with default',
      undefined,
      'default',
      ['default'],
    ],
    ['wraps number in array', 42, undefined, [42]],
    ['wraps false in array', false, undefined, [false]],
  ])('%s', (_, val, defaultValue, expected) => {
    expect(toArray(val, defaultValue)).toEqual(expected)
  })
})

describe('resolveComma', () => {
  test.each<[string, string[], string[]]>([
    ['splits comma-separated values', ['esm,cjs'], ['esm', 'cjs']],
    ['handles values without commas', ['esm', 'cjs'], ['esm', 'cjs']],
    ['handles mixed values', ['esm,cjs', 'iife'], ['esm', 'cjs', 'iife']],
    ['handles empty array', [], []],
  ])('%s', (_, input, expected) => {
    expect(resolveComma(input)).toEqual(expected)
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
  test.each([
    [
      'replaces backslashes with forward slashes',
      String.raw`foo\bar\baz`,
      'foo/bar/baz',
    ],
    ['leaves forward slashes unchanged', 'foo/bar/baz', 'foo/bar/baz'],
    ['handles empty string', '', ''],
    ['handles mixed slashes', String.raw`foo\bar/baz`, 'foo/bar/baz'],
  ])('%s', (_, input, expected) => {
    expect(slash(input)).toBe(expected)
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
