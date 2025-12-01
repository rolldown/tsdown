import { describe, expect, test } from 'vitest'
import { transformTsupConfig } from '../helpers/tsup-config.ts'

describe('plugin migrations', () => {
  test('unplugin-*/esbuild should transform to unplugin-*/rolldown', () => {
    const input = `import icons from 'unplugin-icons/esbuild'
import vue from 'unplugin-vue/esbuild'

export default {
  esbuildPlugins: [icons(), vue()],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('unplugin-icons/rolldown')
    expect(code).toContain('unplugin-vue/rolldown')
    expect(code).not.toContain('unplugin-icons/esbuild')
    expect(code).not.toContain('unplugin-vue/esbuild')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('esbuildPlugins should transform to plugins', () => {
    const input = `export default {
  esbuildPlugins: [somePlugin()],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('plugins:')
    expect(code).not.toContain('esbuildPlugins')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('plugins option should emit warning (experimental in tsup)', () => {
    const input = `export default {
  plugins: [somePlugin()],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('plugins'))

    expect({ code, warnings }).toMatchSnapshot()
  })
})

describe('option transformations', () => {
  test('splitting should emit warning', () => {
    const input = `export default {
  splitting: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('splitting'))

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('bundle: true should be removed', () => {
    const input = `export default {
  bundle: true,
  entry: ['src/index.ts'],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).not.toContain('bundle')
    expect(code).toContain('entry')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('bundle: false should transform to unbundle: true', () => {
    const input = `export default {
  bundle: false,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('unbundle: true')
    expect(code).not.toContain('bundle: false')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('publicDir should transform to copy', () => {
    const input = `export default {
  publicDir: 'public',
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('copy:')
    expect(code).not.toContain('publicDir')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('removeNodeProtocol should transform to nodeProtocol: "strip"', () => {
    const input = `export default {
  removeNodeProtocol: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain("nodeProtocol: 'strip'")
    expect(code).not.toContain('removeNodeProtocol')

    expect({ code, warnings }).toMatchSnapshot()
  })
})

describe('warning options', () => {
  test('metafile should emit warning (use Vite DevTools)', () => {
    const input = `export default {
  metafile: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('metafile'))

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('injectStyle should emit warning (not implemented)', () => {
    const input = `export default {
  injectStyle: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('injectStyle'))

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('cjsInterop should emit warning', () => {
    const input = `export default {
  cjsInterop: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('cjsInterop'))

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('swc should emit warning (use oxc)', () => {
    const input = `export default {
  swc: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('swc'))

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('experimentalDts should emit warning', () => {
    const input = `export default {
  experimentalDts: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('experimentalDts'))

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('legacyOutput should emit warning', () => {
    const input = `export default {
  legacyOutput: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(warnings).toContainEqual(expect.stringContaining('legacyOutput'))

    expect({ code, warnings }).toMatchSnapshot()
  })
})

describe('default values', () => {
  test('should add format: "cjs" when not present', () => {
    const input = `export default {
  entry: ['src/index.ts'],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain("format: 'cjs'")

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('should add clean: false when not present', () => {
    const input = `export default {
  entry: ['src/index.ts'],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('clean: false')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('should add dts: false when not present', () => {
    const input = `export default {
  entry: ['src/index.ts'],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('dts: false')

    expect({ code, warnings }).toMatchSnapshot()
  })

  test('should add target: false when not present', () => {
    const input = `export default {
  entry: ['src/index.ts'],
}`

    const { code, warnings } = transformTsupConfig(input)

    expect(code).toContain('target: false')

    expect({ code, warnings }).toMatchSnapshot()
  })
})

describe('comprehensive transformation', () => {
  test('should transform complex tsup config', () => {
    const input = `import icons from 'unplugin-icons/esbuild'

export default {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  esbuildPlugins: [icons()],
  bundle: false,
  publicDir: 'public',
  splitting: true,
  metafile: true,
}`

    const { code, warnings } = transformTsupConfig(input)

    // Verify transformations
    expect(code).toContain('unplugin-icons/rolldown')
    expect(code).toContain('plugins:')
    expect(code).toContain('unbundle: true')
    expect(code).toContain('copy:')
    expect(code).not.toContain('esbuildPlugins')
    expect(code).not.toContain('bundle: false')
    expect(code).not.toContain('publicDir')

    // Verify warnings
    expect(warnings).toContainEqual(expect.stringContaining('splitting'))
    expect(warnings).toContainEqual(expect.stringContaining('metafile'))

    expect({ code, warnings }).toMatchSnapshot()
  })
})
