import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writeFixtures } from '../../tests/utils.ts'
import { getPackageType, normalizeFormat, readPackageJson } from './package.ts'

describe('getPackageType', () => {
  test('returns "module" for module type', () => {
    expect(getPackageType({ type: 'module' })).toBe('module')
  })

  test('returns "commonjs" for commonjs type', () => {
    expect(getPackageType({ type: 'commonjs' })).toBe('commonjs')
  })

  test('returns undefined when no type field', () => {
    expect(getPackageType({})).toBeUndefined()
  })

  test('returns undefined for undefined pkg', () => {
    expect(getPackageType(undefined)).toBeUndefined()
  })

  test('throws for invalid type value', () => {
    // @ts-expect-error testing invalid input
    expect(() => getPackageType({ type: 'invalid' })).toThrow(
      'Invalid package.json type: invalid',
    )
  })
})

describe('normalizeFormat', () => {
  test('normalizes "es" to "es"', () => {
    expect(normalizeFormat('es')).toBe('es')
  })

  test('normalizes "esm" to "es"', () => {
    expect(normalizeFormat('esm')).toBe('es')
  })

  test('normalizes "module" to "es"', () => {
    expect(normalizeFormat('module')).toBe('es')
  })

  test('normalizes "cjs" to "cjs"', () => {
    expect(normalizeFormat('cjs')).toBe('cjs')
  })

  test('normalizes "commonjs" to "cjs"', () => {
    expect(normalizeFormat('commonjs')).toBe('cjs')
  })

  test('returns iife as-is', () => {
    expect(normalizeFormat('iife')).toBe('iife')
  })
})

describe('readPackageJson', () => {
  test('reads package.json from directory', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
    })
    const result = await readPackageJson(testDir)
    expect(result).toBeDefined()
    expect(result!.name).toBe('test-pkg')
    expect(result!.version).toBe('1.0.0')
    expect(result!.packageJsonPath).toBe(path.join(testDir, 'package.json'))
  })

  test('returns result with packageJsonPath property', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'index.ts': '',
    })
    const result = await readPackageJson(testDir)
    if (result) {
      expect(result.packageJsonPath).toContain('package.json')
    }
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
