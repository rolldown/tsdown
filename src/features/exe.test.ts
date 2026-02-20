import { describe, expect, it } from 'vitest'
import { resolveExeName } from './exe.ts'
import type { ResolvedConfig } from '../config/index.ts'

function makeConfig(
  overrides: Partial<Pick<ResolvedConfig, 'outFile' | 'entry'>>,
): ResolvedConfig {
  const config: Partial<ResolvedConfig> = {
    entry: {},
    ...overrides,
  }
  return config as ResolvedConfig
}

describe('resolveExeName', () => {
  it('uses outFile when provided', () => {
    expect(resolveExeName(makeConfig({ outFile: 'hello' }))).toBe('hello')
  })

  it('strips extension from outFile', () => {
    expect(resolveExeName(makeConfig({ outFile: 'hello.js' }))).toBe('hello')
  })

  it('derives from first entry key', () => {
    expect(resolveExeName(makeConfig({ entry: { cli: 'src/cli.ts' } }))).toBe(
      'cli',
    )
  })

  it('uses first entry key when multiple entries exist', () => {
    expect(
      resolveExeName(
        makeConfig({
          entry: { 'my-tool': 'src/cli.ts', other: 'src/other.ts' },
        }),
      ),
    ).toBe('my-tool')
  })

  it('falls back to app when no outFile and no entries', () => {
    expect(resolveExeName(makeConfig({}))).toBe('app')
  })

  it('prefers outFile over entry key', () => {
    expect(
      resolveExeName(
        makeConfig({ outFile: 'custom', entry: { cli: 'src/cli.ts' } }),
      ),
    ).toBe('custom')
  })
})
