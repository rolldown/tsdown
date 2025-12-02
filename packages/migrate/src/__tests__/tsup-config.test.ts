import dedent from 'dedent'
import { describe, expect, test } from 'vitest'
import { transformTsupConfig } from '../helpers/tsup-config.ts'

function transform(code: string, filename: string, warningCount = 0) {
  const result = transformTsupConfig(dedent(code), filename)
  expect(result.code).matchSnapshot('code')
  if (warningCount > 0) {
    expect(result.warnings).toMatchSnapshot('warnings')
  }
  expect(result.warnings).lengthOf(warningCount)
  return result
}

describe('plugin migrations', () => {
  test('unplugin-*/esbuild should transform to unplugin-*/rolldown', () => {
    const input = `
      import icons from 'unplugin-icons/esbuild'
      import vue from 'unplugin-vue/esbuild'

      export default {
        esbuildPlugins: [icons(), vue()],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('unplugin-icons/rolldown')
    expect(code).toContain('unplugin-vue/rolldown')
    expect(code).not.toContain('unplugin-icons/esbuild')
    expect(code).not.toContain('unplugin-vue/esbuild')
  })

  test('esbuildPlugins should transform to plugins', () => {
    const input = `
      export default {
        esbuildPlugins: [somePlugin()],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('plugins:')
    expect(code).not.toContain('esbuildPlugins')
  })

  test('plugins option should emit warning (experimental in tsup)', () => {
    const input = `
      export default {
        plugins: [somePlugin()],
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('plugins'))
  })
})

describe('option transformations', () => {
  test('entryPoints should transform to entry', () => {
    const input = `
      export default {
        entryPoints: ['src/index.ts'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('entry:')
    expect(code).not.toContain('entryPoints')
  })

  test('splitting should emit warning', () => {
    const input = `
      export default {
        splitting: true,
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('splitting'))
  })

  test('bundle: true should be removed', () => {
    const input = `
      export default {
        bundle: true,
        entry: ['src/index.ts'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).not.toContain('bundle')
    expect(code).toContain('entry')
  })

  test('bundle: false should transform to unbundle: true', () => {
    const input = `
      export default {
        bundle: false,
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('unbundle: true')
    expect(code).not.toContain('bundle: false')
  })

  test('publicDir should transform to copy', () => {
    const input = `
      export default {
        publicDir: 'public',
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('copy:')
    expect(code).not.toContain('publicDir')
  })

  test('removeNodeProtocol should transform to nodeProtocol: "strip"', () => {
    const input = `
      export default {
        removeNodeProtocol: true,
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain("nodeProtocol: 'strip'")
    expect(code).not.toContain('removeNodeProtocol')
  })
})

describe('warning options', () => {
  test('metafile should emit warning (use Vite DevTools)', () => {
    const input = `
      export default {
        metafile: true,
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('metafile'))
  })

  test('injectStyle should emit warning (not implemented)', () => {
    const input = `
      export default {
        injectStyle: true,
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('injectStyle'))
  })

  test('cjsInterop should emit warning', () => {
    const input = `
      export default {
        cjsInterop: true,
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('cjsDefault')
    expect(code).not.toContain('cjsInterop')
  })

  test('swc should emit warning (use oxc)', () => {
    const input = `
      export default {
        swc: true,
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('swc'))
  })

  test('experimentalDts should emit warning', () => {
    const input = `
      export default {
        experimentalDts: true,
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('experimentalDts'))
  })

  test('legacyOutput should emit warning', () => {
    const input = `
      export default {
        legacyOutput: true,
      }
    `
    const { warnings } = transform(input, 'tsup.config.ts', 1)
    expect(warnings).toContainEqual(expect.stringContaining('legacyOutput'))
  })
})

describe('default values', () => {
  test('should add format: "cjs" when not present', () => {
    const input = `
      export default {
        entry: ['src/index.ts'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain("format: 'cjs'")
  })

  test('should not add format when present', () => {
    const input = `
      export default {
        format: ['esm', 'cjs'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).contains("format: ['esm', 'cjs']")
    expect(code).not.toContain("format: 'cjs'")
  })

  test('should add clean: false when not present', () => {
    const input = `
      export default {
        entry: ['src/index.ts'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('clean: false')
  })

  test('should add dts: false when not present', () => {
    const input = `
      export default {
        entry: ['src/index.ts'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('dts: false')
  })

  test('should add target: false when not present', () => {
    const input = `
      export default {
        entry: ['src/index.ts'],
      }
    `
    const { code } = transform(input, 'tsup.config.ts')
    expect(code).toContain('target: false')
  })
})

describe('comprehensive transformation', () => {
  test('should transform complex tsup config', () => {
    const input = `
      import icons from 'unplugin-icons/esbuild'

      export default {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        esbuildPlugins: [icons()],
        bundle: false,
        publicDir: 'public',
        splitting: true,
        metafile: true,
      }
    `
    const { code, warnings } = transform(input, 'tsup.config.ts', 2)

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
  })
})
