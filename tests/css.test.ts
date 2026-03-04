import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

describe('css', () => {
  test('basic', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `body { color: red }`,
      },
    })
    expect(outputFiles).toEqual(['index.mjs', 'style.css'])
  })

  test('unbundle', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'index.ts': `import './style.css'`,
        'style.css': `body { color: red }`,
      },
      options: {
        unbundle: true,
      },
    })
    expect(outputFiles).toEqual(['index.mjs', 'style.css', 'style.mjs'])
  })

  test('with dts', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'style.css': `body { color: red }`,
      },
      options: {
        entry: ['style.css'],
        dts: true,
      },
    })
    expect(outputFiles).toEqual(['style.css', 'style.mjs'])
  })

  test.for([true, false])(
    'merge css with splitting=%s',
    async (splitting, context) => {
      const { outputFiles, fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `
          import './style.css'
          export const loadAsync = () => import('./async')
        `,
          'style.css': `body { color: red }`,
          'async.ts': `import './async.css'`,
          'async.css': `.async { color: blue }`,
        },
        options: {
          css: {
            splitting,
            fileName: 'index.css',
          },
        },
      })

      const cssFiles = outputFiles.filter((f) => f.endsWith('.css'))
      expect(fileMap['index.css']).toContain('body { color: red }')
      if (splitting) {
        expect(cssFiles).toHaveLength(2)
        expect(cssFiles).toContain('index.css')
      } else {
        expect(cssFiles).toEqual(['index.css'])
        expect(fileMap['index.css']).toContain('.async { color: blue }')
      }
    },
  )

  test('#216', async (context) => {
    const { outputFiles } = await testBuild({
      context,
      files: {
        'foo.css': `.foo { color: red; }`,
        'bar.css': `@import './foo.css'; .bar { color: blue; }`,
      },
      options: {
        entry: ['foo.css', 'bar.css'],
        css: { splitting: true },
      },
    })
    expect(outputFiles).toContain('bar.css')
    expect(outputFiles).toContain('foo.css')
  })
})
