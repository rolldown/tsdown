import { describe, expect, it } from 'vitest'
import { getTypesPackageName, parseNodeModulesPath, parsePackageSpecifier } from './deps.ts'

describe('parsePackageSpecifier', () => {
  it('parses a simple package name', () => {
    expect(parsePackageSpecifier('lodash')).toEqual(['lodash', ''])
  })

  it('parses a simple package with subpath', () => {
    expect(parsePackageSpecifier('lodash/get')).toEqual(['lodash', '/get'])
  })

  it('parses a simple package with deep subpath', () => {
    expect(parsePackageSpecifier('markdown-it/lib/token.mjs')).toEqual([
      'markdown-it',
      '/lib/token.mjs',
    ])
  })

  it('parses a scoped package name', () => {
    expect(parsePackageSpecifier('@scope/pkg')).toEqual(['@scope/pkg', ''])
  })

  it('parses a scoped package with subpath', () => {
    expect(parsePackageSpecifier('@scope/pkg/subpath')).toEqual([
      '@scope/pkg',
      '/subpath',
    ])
  })
})

describe('parseNodeModulesPath', () => {
  it('returns undefined for paths without node_modules', () => {
    expect(parseNodeModulesPath('/project/project/src/index.ts')).toBeUndefined()
  })

  it('parses a simple package in node_modules', () => {
    expect(parseNodeModulesPath('/project/node_modules/lodash/index.js')).toEqual([
      'lodash',
      '/index.js',
      '/project/node_modules/lodash',
    ])
  })

  it('parses a scoped package in node_modules', () => {
    expect(
      parseNodeModulesPath('/project/node_modules/@scope/pkg/dist/index.js'),
    ).toEqual([
      '@scope/pkg',
      '/dist/index.js',
      '/project/node_modules/@scope/pkg',
    ])
  })

  it('uses the last node_modules segment for nested deps', () => {
    expect(
      parseNodeModulesPath('/project/node_modules/foo/node_modules/bar/lib/utils.js'),
    ).toEqual([
      'bar',
      '/lib/utils.js',
      '/project/node_modules/foo/node_modules/bar',
    ])
  })

  it('handles package root without subpath', () => {
    expect(parseNodeModulesPath('/project/node_modules/lodash')).toEqual([
      'lodash',
      '',
      '/project/node_modules/lodash',
    ])
  })

  it('normalizes backslashes on Windows-style paths', () => {
    expect(
      parseNodeModulesPath(String.raw`C:\project\node_modules\lodash\index.js`),
    ).toEqual(['lodash', '/index.js', 'C:/project/node_modules/lodash'])
  })
})

describe('getTypesPackageName', () => {
  it('maps deep imports to the root DefinitelyTyped package', () => {
    expect(getTypesPackageName('markdown-it/lib/token.mjs')).toBe(
      '@types/markdown-it',
    )
  })

  it('maps deep imports from scoped packages to the scoped DefinitelyTyped package', () => {
    expect(getTypesPackageName('@scope/pkg/subpath')).toBe('@types/scope__pkg')
  })
})
