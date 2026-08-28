import { describe, expect, it } from 'vitest'
import { parseCLI } from './cli.ts'

function parse(...args: string[]): Record<string, any> {
  return parseCLI(['node', 'tsdown', ...args]).options
}

describe('parseCLI', () => {
  it('camel-cases nested option keys', () => {
    expect(parse('--deps.never-bundle', 'leftpad').deps).toEqual({
      neverBundle: 'leftpad',
    })
    expect(parse('--deps.neverBundle', 'leftpad').deps).toEqual({
      neverBundle: 'leftpad',
    })
    expect(parse('--deps.dts.never-bundle', 'leftpad').deps).toEqual({
      dts: { neverBundle: 'leftpad' },
    })
  })

  it('keeps user-defined keys verbatim', () => {
    const options = parse(
      '--env.my-var',
      'a',
      '--define.my-flag',
      'b',
      '--alias.my-lib',
      './src/my-lib.ts',
    )
    expect(options.env).toEqual({ 'my-var': 'a' })
    expect(options.define).toEqual({ 'my-flag': 'b' })
    expect(options.alias).toEqual({ 'my-lib': './src/my-lib.ts' })
  })

  it('leaves top-level flags and entries alone', () => {
    const { args, options } = parseCLI([
      'node',
      'tsdown',
      'src/index.ts',
      '--out-dir',
      'lib',
    ])
    expect(args).toEqual(['src/index.ts'])
    expect(options.outDir).toBe('lib')
  })
})
