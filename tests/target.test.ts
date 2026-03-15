import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('target', () => {
  test('js syntax lowering', async (context) => {
    const { snapshot } = await testBuild({
      context,
      files: { 'index.ts': 'export const foo: number = a?.b?.()' },
      options: { target: 'es2015' },
    })
    expect(snapshot).not.contain('?.')
  })

  test('unnecessary js syntax lowering', async (context) => {
    const { snapshot } = await testBuild({
      context,
      files: { 'index.ts': 'export const foo: number = a?.b?.()' },
      options: { target: ['chrome120', 'safari16', 'firefox120'] },
    })
    expect(snapshot).contain('?.')
  })

  test('target: false disables all syntax transformations', async (context) => {
    const { snapshot } = await testBuild({
      context,
      files: { 'index.ts': 'export const foo: number = a?.b?.()' },
      options: { target: false },
    })
    // Modern syntax should be preserved when target is false
    expect(snapshot).contain('?.')
  })

  describe('css', () => {
    test('css syntax lowering (entry: index.css)', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.css': '.foo { & .bar { color: red } }',
        },
        options: {
          entry: 'index.css',
          target: 'chrome108',
        },
      })
      expect(fileMap['style.css']).toContain('.foo .bar')
      expect(fileMap['style.css']).not.toContain('&')
    })

    test('css syntax lowering (entry: index.ts)', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './index.css'`,
          'index.css': '.foo { & .bar { color: red } }',
        },
        options: {
          entry: 'index.ts',
          target: 'chrome108',
        },
      })
      expect(fileMap['style.css']).toContain('.foo .bar')
      expect(fileMap['style.css']).not.toContain('&')
    })

    test('unnecessary css syntax lowering (entry: index.css)', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.css': '.foo { & .bar { color: red } }',
        },
        options: {
          entry: 'index.css',
          target: ['safari18.4'],
        },
      })
      expect(fileMap['style.css']).toContain('& .bar')
    })

    test('unnecessary css syntax lowering (entry: index.ts)', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './index.css'`,
          'index.css': '.foo { & .bar { color: red } }',
        },
        options: {
          entry: 'index.ts',
          target: ['safari18.4'],
        },
      })
      expect(fileMap['style.css']).toContain('& .bar')
    })

    test('target=false with CSS preserves modern syntax imported (entry: index.css)', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.css': `.foo { & .bar { color: red } }`,
        },
        options: {
          entry: 'index.css',
          target: 'chrome90',
          css: { target: false },
        },
      })
      expect(fileMap['style.css']).toContain('& .bar')
    })

    test('target=false with CSS preserves modern syntax imported (entry: index.ts)', async (context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './index.css'`,
          'index.css': `.foo { & .bar { color: red } }`,
        },
        options: {
          target: 'chrome90',
          css: { target: false },
        },
      })
      expect(fileMap['style.css']).toContain('& .bar')
    })
  })
})
