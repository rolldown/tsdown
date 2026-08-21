import { expect, test } from 'vitest'
import { cli, normalizeFlags } from './cli.ts'
import type { UserConfig } from './config.ts'

function parseFlags(...argv: string[]): UserConfig {
  cli.parse(['node', 'tsdown', ...argv], { run: false })
  return normalizeFlags(cli.options as UserConfig)
}

test('--deps.never-bundle maps to deps.neverBundle', () => {
  expect(parseFlags('--deps.never-bundle', 'lodash').deps).toEqual({
    neverBundle: 'lodash',
  })
})

test('--deps.neverBundle keeps working', () => {
  expect(parseFlags('--deps.neverBundle', 'lodash').deps).toEqual({
    neverBundle: 'lodash',
  })
})

test('--env.* keys are left verbatim', () => {
  expect(parseFlags('--env.MY-VAR', 'a', '--env.other_var', 'b').env).toEqual({
    'MY-VAR': 'a',
    other_var: 'b',
  })
})
