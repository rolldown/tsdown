import isInCi from 'is-in-ci'
import { describe, expect, test } from 'vitest'
import {
  resolveFeatureOption as _resolveFeatureOption,
  mergeConfig,
} from './options.ts'

const defaultOption = { a: 1 }
interface DefaultOption {
  a?: number
}
const resolveFeatureOption = _resolveFeatureOption<DefaultOption>

describe('resolveFeatureOption', () => {
  test('literal boolean', () => {
    expect(resolveFeatureOption(true, defaultOption)).toBe(defaultOption)
    expect(resolveFeatureOption(false, defaultOption)).toBe(false)
  })

  test('literal CI', () => {
    expect(resolveFeatureOption('ci-only', defaultOption)).toBe(
      isInCi ? defaultOption : false,
    )
    expect(resolveFeatureOption('local-only', defaultOption)).toBe(
      isInCi ? false : defaultOption,
    )
  })

  test('object with boolean enabled', () => {
    {
      const value = { a: 42 }
      expect(resolveFeatureOption(value, defaultOption)).toBe(value)
    }

    {
      const value = { enabled: true, a: 42 }
      expect(resolveFeatureOption(value, defaultOption)).toBe(value)
    }

    expect(resolveFeatureOption({ enabled: false, a: 42 }, defaultOption)).toBe(
      false,
    )
  })

  test('object with CI enabled', () => {
    {
      const value = { enabled: 'ci-only' as const, a: 42 }
      expect(resolveFeatureOption(value, defaultOption)).toBe(
        isInCi ? value : false,
      )
    }

    {
      const value = { enabled: 'local-only' as const, a: 42 }
      expect(resolveFeatureOption(value, defaultOption)).toBe(
        isInCi ? false : value,
      )
    }
  })
})

test('mergeConfig', () => {
  expect(
    mergeConfig(
      {
        a: 1,
        obj: { c: 2, d: 3 },
        arr: [1, 2, 3],
      } as any,
      {
        obj: { c: 42 },
        arr: [4, 5],
        e: 5,
      } as any,
    ),
  ).toMatchInlineSnapshot(`
    {
      "a": 1,
      "arr": [
        4,
        5,
      ],
      "e": 5,
      "obj": {
        "c": 42,
        "d": 3,
      },
    }
  `)
})
