import { afterEach, describe, expect, test, vi } from 'vitest'
import { isInCI } from '../utils/ci.ts'
import {
  resolveFeatureOption as _resolveFeatureOption,
  mergeConfig,
} from './options.ts'

const defaultOption = { a: 1 }
interface DefaultOption {
  a?: number
}
const resolveFeatureOption = _resolveFeatureOption<DefaultOption>

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isInCI', () => {
  test('detects CI from process.env.CI', () => {
    vi.stubEnv('CI', undefined)
    expect(isInCI()).toBe(false)

    vi.stubEnv('CI', '')
    expect(isInCI()).toBe(true)

    vi.stubEnv('CI', '0')
    expect(isInCI()).toBe(false)

    vi.stubEnv('CI', 'false')
    expect(isInCI()).toBe(false)

    vi.stubEnv('CI', 'FALSE')
    expect(isInCI()).toBe(false)

    vi.stubEnv('CI', '1')
    expect(isInCI()).toBe(true)

    vi.stubEnv('CI', 'true')
    expect(isInCI()).toBe(true)
  })
})

describe('resolveFeatureOption', () => {
  test('literal boolean', () => {
    expect(resolveFeatureOption(true, defaultOption)).toBe(defaultOption)
    expect(resolveFeatureOption(false, defaultOption)).toBe(false)
  })

  test('literal CI in CI', () => {
    vi.stubEnv('CI', 'true')

    expect(resolveFeatureOption('ci-only', defaultOption)).toBe(defaultOption)
    expect(resolveFeatureOption('local-only', defaultOption)).toBe(false)
  })

  test('literal CI locally', () => {
    vi.stubEnv('CI', undefined)

    expect(resolveFeatureOption('ci-only', defaultOption)).toBe(false)
    expect(resolveFeatureOption('local-only', defaultOption)).toBe(
      defaultOption,
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
    vi.stubEnv('CI', 'true')

    {
      const value = { enabled: 'ci-only' as const, a: 42 }
      expect(resolveFeatureOption(value, defaultOption)).toBe(value)
    }

    {
      const value = { enabled: 'local-only' as const, a: 42 }
      expect(resolveFeatureOption(value, defaultOption)).toBe(false)
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
  expect(
    mergeConfig(
      {
        a: 1,
        plugins: ['a'],
        inputOptions: {
          plugins: 'b',
        },
      } as any,
      {
        a: 2,
        plugins: ['c'],
        inputOptions: {
          plugins: 'd',
        },
      } as any,
    ),
  ).toMatchInlineSnapshot(`
    {
      "a": 2,
      "inputOptions": {
        "plugins": [
          "b",
          "d",
        ],
      },
      "plugins": [
        "a",
        "c",
      ],
    }
  `)
})
