import { describe, expect, it, vi } from 'vitest'
import {
  DepsPlugin,
  getTypesPackageName,
  parseNodeModulesPath,
  parsePackageSpecifier,
  resolveDepsConfig,
} from './deps.ts'
import type { UserConfig } from '../config/types.ts'

describe('resolveDepsConfig', () => {
  it('enables dependency subpath resolution by default', () => {
    expect(resolveDepsConfig({}).resolveDepSubpath).toBe(true)
    expect(
      resolveDepsConfig({
        deps: { resolveDepSubpath: false },
      }).resolveDepSubpath,
    ).toBe(false)
  })

  it('rejects skipNodeModulesBundle together with neverBundle: true', () => {
    expect(() =>
      resolveDepsConfig({
        deps: { neverBundle: true, skipNodeModulesBundle: true },
      }),
    ).toThrow('Cannot be used with `deps.neverBundle: true`')
  })

  it('allows neverBundle: true together with alwaysBundle', () => {
    const resolved = resolveDepsConfig({
      deps: { neverBundle: true, alwaysBundle: ['keep'] },
    })
    expect(resolved.neverBundle).toBe(true)
    expect(resolved.alwaysBundle?.('keep', undefined)).toBe(true)
  })

  it('resolves declaration-only dependency options separately', () => {
    const resolved = resolveDepsConfig({
      deps: {
        alwaysBundle: ['runtime-inline'],
        neverBundle: 'runtime-external',
        dts: {
          alwaysBundle: ['types-inline', /^scoped-types-/],
          neverBundle: '/^types-external$/',
        },
      },
    })

    expect(resolved.alwaysBundle?.('runtime-inline', undefined)).toBe(true)
    expect(resolved.alwaysBundle?.('types-inline', undefined)).toBe(false)
    expect(resolved.neverBundle).toBe('runtime-external')

    expect(resolved.dts.alwaysBundle?.('types-inline', undefined)).toBe(true)
    expect(resolved.dts.alwaysBundle?.('scoped-types-pkg', undefined)).toBe(
      true,
    )
    expect(resolved.dts.alwaysBundle?.('runtime-inline', undefined)).toBe(false)
    expect(resolved.dts.neverBundle).toBeInstanceOf(RegExp)
    expect((resolved.dts.neverBundle as RegExp).test('types-external')).toBe(
      true,
    )
  })
})

describe('DepsPlugin', () => {
  it('uses dts alwaysBundle only for declaration importers', async () => {
    const plugin = DepsPlugin(
      {
        pkg: {
          dependencies: {
            'types-inline': '^1.0.0',
          },
        },
        deps: resolveDepsConfig({
          deps: {
            dts: {
              alwaysBundle: ['types-inline'],
            },
          },
        }),
      } as any,
      { inlinedDeps: new Map() } as any,
    )
    const handler = (plugin.resolveId as any).handler
    const resolve = vi.fn((id: string) =>
      Promise.resolve({
        id: `/project/node_modules/${id}/index.d.ts`,
      }),
    )

    await expect(
      handler.call({ resolve }, 'types-inline', '/project/src/index.d.ts', {}),
    ).resolves.toEqual({
      id: '/project/node_modules/types-inline/index.d.ts',
      moduleSideEffects: undefined,
    })

    await expect(
      handler.call({ resolve }, 'types-inline', '/project/src/index.ts', {}),
    ).resolves.toEqual({
      id: 'types-inline',
      external: true,
      moduleSideEffects: undefined,
    })
  })

  it('externalizes production dependencies without resolving', async () => {
    const plugin = DepsPlugin(
      {
        pkg: { dependencies: { 'some-dep': '^1.0.0' } },
        deps: resolveDepsConfig({}),
      } as any,
      { inlinedDeps: new Map() } as any,
    )
    const handler = (plugin.resolveId as any).handler
    const resolve = vi.fn(() => Promise.resolve(null))

    await expect(
      handler.call({ resolve }, 'some-dep', '/project/src/index.ts', {}),
    ).resolves.toEqual({
      id: 'some-dep',
      external: true,
      moduleSideEffects: undefined,
    })
    expect(resolve).not.toHaveBeenCalled()

    // subpath imports require resolution for `resolveDepSubpath`
    await expect(
      handler.call({ resolve }, 'some-dep/utils', '/project/src/index.ts', {}),
    ).resolves.toEqual({
      id: 'some-dep/utils',
      external: true,
      moduleSideEffects: undefined,
    })
    expect(resolve).toHaveBeenCalledTimes(1)
  })
})

describe('DepsPlugin with neverBundle: true', () => {
  function getHandler(deps: UserConfig['deps']) {
    const plugin = DepsPlugin(
      { deps: resolveDepsConfig({ deps }) } as any,
      { inlinedDeps: new Map() } as any,
    )
    return (plugin.resolveId as any).handler
  }

  it('externalizes npm package specifiers without resolving', async () => {
    const handler = getHandler({ neverBundle: true })
    const resolve = vi.fn()

    await expect(
      handler.call({ resolve }, 'some-dep', '/project/src/index.ts', {}),
    ).resolves.toEqual({
      id: 'some-dep',
      external: true,
      moduleSideEffects: undefined,
    })
    await expect(
      handler.call(
        { resolve },
        '@scope/pkg/utils',
        '/project/src/index.ts',
        {},
      ),
    ).resolves.toEqual({
      id: '@scope/pkg/utils',
      external: true,
      moduleSideEffects: undefined,
    })
    await expect(
      handler.call({ resolve }, 'node:fs', '/project/src/index.ts', {}),
    ).resolves.toEqual({
      id: 'node:fs',
      external: true,
      moduleSideEffects: false,
    })
    expect(resolve).not.toHaveBeenCalled()
  })

  it('does not externalize absolute paths and virtual modules', async () => {
    const handler = getHandler({ neverBundle: true })
    const resolve = vi.fn(() => Promise.resolve(null))

    await expect(
      handler.call(
        { resolve },
        '/project/file.ts',
        '/project/src/index.ts',
        {},
      ),
    ).resolves.toBeUndefined()
    await expect(
      handler.call({ resolve }, '\0virtual', '/project/src/index.ts', {}),
    ).resolves.toBeUndefined()
  })

  it('resolves ids that do not follow npm naming conventions', async () => {
    const handler = getHandler({ neverBundle: true })
    const resolve = vi.fn((id: string) =>
      Promise.resolve(
        id === '#dep'
          ? { id: '/project/node_modules/my-dep/index.js' }
          : { id: '/project/src/local.ts' },
      ),
    )

    // resolves into node_modules → external with the original specifier
    await expect(
      handler.call({ resolve }, '#dep', '/project/src/index.ts', {}),
    ).resolves.toEqual({
      id: '#dep',
      external: true,
      moduleSideEffects: undefined,
    })
    // resolves to local files → bundled
    for (const id of ['#local', '~/local', '@/local']) {
      await expect(
        handler.call({ resolve }, id, '/project/src/index.ts', {}),
      ).resolves.toEqual({ id: '/project/src/local.ts' })
    }
  })

  it('lets alwaysBundle opt imports back into the bundle', async () => {
    const handler = getHandler({ neverBundle: true, alwaysBundle: ['keep'] })
    const resolve = vi.fn()

    await expect(
      handler.call({ resolve }, 'keep', '/project/src/index.ts', {}),
    ).resolves.toBeUndefined()
    await expect(
      handler.call({ resolve }, 'other', '/project/src/index.ts', {}),
    ).resolves.toMatchObject({ id: 'other', external: true })
  })

  it('uses dts.neverBundle override for declaration importers', async () => {
    const handler = getHandler({
      neverBundle: true,
      dts: { neverBundle: ['keep-external'] },
    })
    const resolve = vi.fn(() =>
      Promise.resolve({ id: '/project/node_modules/pkg/index.d.ts' }),
    )

    // declaration importers fall back to the resolve-based strategy
    await expect(
      handler.call({ resolve }, 'pkg', '/project/src/index.d.ts', {}),
    ).resolves.toEqual({
      id: '/project/node_modules/pkg/index.d.ts',
      moduleSideEffects: undefined,
    })
    // other importers are still externalized without resolving
    await expect(
      handler.call({ resolve }, 'pkg', '/project/src/index.ts', {}),
    ).resolves.toMatchObject({ id: 'pkg', external: true })
  })
})

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
    expect(
      parseNodeModulesPath('/project/project/src/index.ts'),
    ).toBeUndefined()
  })

  it('parses a simple package in node_modules', () => {
    expect(
      parseNodeModulesPath('/project/node_modules/lodash/index.js'),
    ).toEqual(['lodash', '/index.js', '/project/node_modules/lodash'])
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
      parseNodeModulesPath(
        '/project/node_modules/foo/node_modules/bar/lib/utils.js',
      ),
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
