import { describe, expect, test, vi } from 'vitest'
import { chdir, writeFixtures } from '../../tests/utils.ts'
import { resolveConfig } from '../config/index.ts'
import { flattenPlugins, type TsdownPlugin } from './plugin.ts'
import type { Plugin } from 'rolldown'

describe('flattenPlugins', () => {
  test('flattens nested arrays', async () => {
    const a: Plugin = { name: 'a' }
    const b: Plugin = { name: 'b' }
    const c: Plugin = { name: 'c' }
    const result = await flattenPlugins([a, [b, [c]]])
    expect(result).toEqual([a, b, c])
  })

  test('awaits promises at any depth', async () => {
    const a: Plugin = { name: 'a' }
    const b: Plugin = { name: 'b' }
    const result = await flattenPlugins([
      Promise.resolve(a),
      [Promise.resolve([b])],
    ])
    expect(result).toEqual([a, b])
  })

  test('skips falsy values', async () => {
    const a: Plugin = { name: 'a' }
    const result = await flattenPlugins([a, false, null, undefined, [false]])
    expect(result).toEqual([a])
  })

  test('handles the fromVite plugin shape [viteArray, userArray]', async () => {
    // src/config/options.ts builds `plugins = [viteUserConfig.plugins, plugins]`
    const vitePlugin: Plugin = { name: 'vite' }
    const userPlugin: Plugin = { name: 'user' }
    const result = await flattenPlugins([[vitePlugin], [userPlugin]])
    expect(result).toEqual([vitePlugin, userPlugin])
  })
})

describe('tsdownConfig hook', () => {
  test('mutates config in place', async (context) => {
    const plugin: TsdownPlugin = {
      name: 'mutate',
      tsdownConfig(config) {
        config.sourcemap = true
      },
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      const { configs } = await resolveConfig({
        entry: 'index.ts',
        plugins: [plugin],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(configs[0].sourcemap).toBe(true)
    } finally {
      restoreCwd()
    }
  })

  test('return value is deep-merged', async (context) => {
    const plugin: TsdownPlugin = {
      name: 'return',
      tsdownConfig: () => ({ sourcemap: true, platform: 'browser' }),
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      const { configs } = await resolveConfig({
        entry: 'index.ts',
        plugins: [plugin],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(configs[0].sourcemap).toBe(true)
      expect(configs[0].platform).toBe('browser')
    } finally {
      restoreCwd()
    }
  })

  test('receives inlineConfig as second argument', async (context) => {
    const spy = vi.fn()
    const plugin: TsdownPlugin = { name: 'env', tsdownConfig: spy }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      const inline = {
        entry: 'index.ts',
        plugins: [plugin],
        config: false,
        logLevel: 'silent' as const,
        tsconfig: false as const,
      }
      await resolveConfig(inline)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][1]).toBe(inline)
    } finally {
      restoreCwd()
    }
  })

  test('multiple plugins run in order, later sees earlier mutations', async (context) => {
    const order: string[] = []
    const p1: TsdownPlugin = {
      name: 'p1',
      tsdownConfig(config) {
        order.push('p1')
        config.sourcemap = true
      },
    }
    const p2: TsdownPlugin = {
      name: 'p2',
      tsdownConfig(config) {
        order.push(`p2:sourcemap=${config.sourcemap}`)
      },
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      await resolveConfig({
        entry: 'index.ts',
        plugins: [p1, p2],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(order).toEqual(['p1', 'p2:sourcemap=true'])
    } finally {
      restoreCwd()
    }
  })

  test('async hook is awaited before next plugin', async (context) => {
    const order: string[] = []
    const p1: TsdownPlugin = {
      name: 'p1',
      async tsdownConfig() {
        await new Promise((r) => setTimeout(r, 10))
        order.push('p1-done')
      },
    }
    const p2: TsdownPlugin = {
      name: 'p2',
      tsdownConfig() {
        order.push('p2-start')
      },
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      await resolveConfig({
        entry: 'index.ts',
        plugins: [p1, p2],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(order).toEqual(['p1-done', 'p2-start'])
    } finally {
      restoreCwd()
    }
  })

  test('plain Rolldown plugin without hooks is a no-op', async (context) => {
    const plugin: Plugin = { name: 'plain' }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      const { configs } = await resolveConfig({
        entry: 'index.ts',
        plugins: [plugin],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(configs).toHaveLength(1)
    } finally {
      restoreCwd()
    }
  })
})

describe('tsdownConfigResolved hook', () => {
  test('fires once per format for dual-format configs', async (context) => {
    const spy = vi.fn()
    const plugin: TsdownPlugin = {
      name: 'per-format',
      tsdownConfigResolved: spy,
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      await resolveConfig({
        entry: 'index.ts',
        plugins: [plugin],
        format: ['esm', 'cjs'],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(spy).toHaveBeenCalledTimes(2)
      const formats = spy.mock.calls.map((c) => c[0].format)
      expect(formats).toEqual(['es', 'cjs'])
    } finally {
      restoreCwd()
    }
  })

  test('receives a fully resolved config (entry is a map, format normalized)', async (context) => {
    const spy = vi.fn()
    const plugin: TsdownPlugin = { name: 'shape', tsdownConfigResolved: spy }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      await resolveConfig({
        entry: 'index.ts',
        plugins: [plugin],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      const resolved = spy.mock.calls[0][0]
      expect(resolved.entry).toEqual(expect.any(Object))
      expect(resolved.format).toBe('es')
      expect(resolved.logger).toBeDefined()
    } finally {
      restoreCwd()
    }
  })

  test('all tsdownConfig calls complete before first tsdownConfigResolved', async (context) => {
    const order: string[] = []
    const p1: TsdownPlugin = {
      name: 'p1',
      tsdownConfig() {
        order.push('p1:config')
      },
      tsdownConfigResolved() {
        order.push('p1:resolved')
      },
    }
    const p2: TsdownPlugin = {
      name: 'p2',
      tsdownConfig() {
        order.push('p2:config')
      },
      tsdownConfigResolved() {
        order.push('p2:resolved')
      },
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      await resolveConfig({
        entry: 'index.ts',
        plugins: [p1, p2],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(order).toEqual([
        'p1:config',
        'p2:config',
        'p1:resolved',
        'p2:resolved',
      ])
    } finally {
      restoreCwd()
    }
  })

  test('async hook is awaited', async (context) => {
    const order: string[] = []
    const plugin: TsdownPlugin = {
      name: 'async-resolved',
      async tsdownConfigResolved() {
        await new Promise((r) => setTimeout(r, 10))
        order.push('resolved')
      },
    }
    const { testDir } = await writeFixtures(context, { 'index.ts': '' })
    const restoreCwd = chdir(testDir)
    try {
      await resolveConfig({
        entry: 'index.ts',
        plugins: [plugin],
        config: false,
        logLevel: 'silent',
        tsconfig: false,
      })
      expect(order).toEqual(['resolved'])
    } finally {
      restoreCwd()
    }
  })
})
