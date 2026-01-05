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
    expect(outputFiles).toEqual(['index.css', 'index.mjs'])
  })

  test.fails('unbundle', async (context) => {
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
    expect(outputFiles).toEqual(['index.js', 'style.js', 'style.css'])
  })

  test.fails('with dts', async (context) => {
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
    expect(outputFiles).toEqual(['style.css', 'style.js', 'style.d.ts'])
  })

  test('merge css without splitting', async (context) => {
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
          splitting: false,
          fileName: 'index.css',
        },
      },
    })

    expect(outputFiles.filter((f) => f.endsWith('.css'))).toEqual(['index.css'])
    expect(fileMap['index.css']).toContain('body { color: red }')
    expect(fileMap['index.css']).toContain('.async { color: blue }')
  })
})
