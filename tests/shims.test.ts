import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

const code = `export default [
  __dirname, __filename,
  import.meta.url, import.meta.filename, import.meta.dirname,
  import.meta.something
]`

describe('shims', () => {
  test('esm on node', async (context) => {
    const { snapshot } = await testBuild({
      context,
      files: { 'index.ts': code },
      options: {
        platform: 'node',
        shims: true,
      },
    })
    expect(snapshot).contain('const __dirname')
    expect(snapshot).contain('const __filename')
  })

  test('cjs on node w/o shims', async (context) => {
    const { snapshot, warnings } = await testBuild({
      context,
      files: { 'index.ts': code },
      options: {
        format: 'cjs',
        platform: 'node',
      },
    })
    expect(snapshot).contain('require("url").pathToFileURL(__filename).href')
    expect(snapshot).not.contain('import.meta')
    expect(warnings).toMatchObject([
      {
        code: 'EMPTY_IMPORT_META',
      },
    ])
  })

  test('cjs on neutral w/o shims', async (context) => {
    const { snapshot } = await testBuild({
      context,
      files: { 'index.ts': code },
      options: {
        format: 'cjs',
        platform: 'neutral',
      },
    })
    expect(snapshot).contain('require("url").pathToFileURL(__filename).href')
    expect(snapshot).not.contain('import.meta')
  })
})
