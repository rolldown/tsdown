import { describe, expect, test, vi } from 'vitest'
import { warnCjsPlatform } from './cjs.ts'
import type { ResolvedConfig } from '../config/types.ts'
import type { InputOptions } from 'rolldown'

function run(config: Partial<ResolvedConfig>, inputOptions: InputOptions) {
  const warnOnce = vi.fn()
  warnCjsPlatform(
    { logger: { warnOnce }, ...config } as unknown as ResolvedConfig,
    inputOptions,
  )
  return warnOnce
}

describe('warnCjsPlatform', () => {
  test('warns when cjs is built for a non-node platform', () => {
    const warnOnce = run(
      { format: 'cjs', platform: 'browser' },
      { platform: 'node' },
    )
    expect(warnOnce).toHaveBeenCalledOnce()
    expect(warnOnce.mock.calls[0].join(' ')).toContain(
      "`platform: 'browser'` is ignored",
    )
  })

  test('does not warn when the platform is forced via inputOptions', () => {
    const warnOnce = run(
      { format: 'cjs', platform: 'browser' },
      { platform: 'browser' },
    )
    expect(warnOnce).not.toHaveBeenCalled()
  })

  test('does not warn for the neutral platform', () => {
    const warnOnce = run(
      { format: 'cjs', platform: 'neutral' },
      { platform: 'node' },
    )
    expect(warnOnce).not.toHaveBeenCalled()
  })

  test('does not warn for the node platform', () => {
    const warnOnce = run(
      { format: 'cjs', platform: 'node' },
      { platform: 'node' },
    )
    expect(warnOnce).not.toHaveBeenCalled()
  })

  test('does not warn for other formats', () => {
    const warnOnce = run(
      { format: 'es', platform: 'browser' },
      { platform: 'browser' },
    )
    expect(warnOnce).not.toHaveBeenCalled()
  })
})
