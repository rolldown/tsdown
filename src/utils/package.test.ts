import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writeFixtures } from '../../tests/utils.ts'
import {
  getPackageType,
  normalizeFormat,
  readPackageJson,
  type PackageType,
} from './package.ts'
import type { Format, NormalizedFormat } from '../config/index.ts'
import type { PackageJson } from 'pkg-types'

describe('getPackageType', () => {
  test.each<[string, PackageJson | undefined, PackageType]>([
    ['returns "module" for module type', { type: 'module' }, 'module'],
    ['returns "commonjs" for commonjs type', { type: 'commonjs' }, 'commonjs'],
    ['returns undefined when no type field', {}, undefined],
    ['returns undefined for undefined pkg', undefined, undefined],
  ])('%s', (_, pkg, expected) => {
    expect(getPackageType(pkg)).toBe(expected)
  })

  test('throws for invalid type value', () => {
    // @ts-expect-error testing invalid input
    expect(() => getPackageType({ type: 'invalid' })).toThrow(
      'Invalid package.json type: invalid',
    )
  })
})

describe('normalizeFormat', () => {
  test.each<[string, Format, NormalizedFormat]>([
    ['normalizes "es" to "es"', 'es', 'es'],
    ['normalizes "esm" to "es"', 'esm', 'es'],
    ['normalizes "module" to "es"', 'module', 'es'],
    ['normalizes "cjs" to "cjs"', 'cjs', 'cjs'],
    ['normalizes "commonjs" to "cjs"', 'commonjs', 'cjs'],
    ['returns iife as-is', 'iife', 'iife'],
  ])('%s', (_, format, expected) => {
    expect(normalizeFormat(format)).toBe(expected)
  })
})

describe('readPackageJson', () => {
  test('reads package.json from directory', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
      'src/nested/index.ts': '',
    })
    const result = await readPackageJson(testDir)
    expect(result).toBeDefined()
    expect(result!.name).toBe('test-pkg')
    expect(result!.version).toBe('1.0.0')
    expect(result!.packageJsonPath).toBe(path.join(testDir, 'package.json'))

    // looks up the nearest package.json from a nested directory
    const nested = await readPackageJson(path.join(testDir, 'src/nested'))
    expect(nested!.packageJsonPath).toBe(path.join(testDir, 'package.json'))
  })

  test('reads package.json with type field', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'package.json': JSON.stringify({
        name: 'esm-pkg',
        type: 'module',
      }),
    })
    const result = await readPackageJson(testDir)
    expect(result).toBeDefined()
    expect(result!.type).toBe('module')
  })
})
