import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, vi } from 'vitest'
import { build } from '../src/index.ts'
import { chdir, writeFixtures } from './utils.ts'

test('build:prepare on initial watch build and rebuild', async (context) => {
  const prepare = vi.fn()
  const buildDone = vi.fn()
  const { testDir } = await writeFixtures(context, {
    'index.ts': 'export const value = 1',
  })
  const restoreCwd = chdir(testDir)

  const handle = await build({
    entry: 'index.ts',
    config: false,
    outDir: 'dist',
    dts: false,
    logLevel: 'silent',
    tsconfig: false,
    watch: true,
    hooks: {
      'build:prepare': prepare,
      'build:done': buildDone,
    },
  })

  try {
    await vi.waitFor(() => {
      expect(buildDone).toHaveBeenCalledTimes(1)
    })
    expect(prepare).toHaveBeenCalledTimes(1)

    await writeFile(path.join(testDir, 'index.ts'), 'export const value = 2')

    await vi.waitFor(() => {
      expect(prepare).toHaveBeenCalledTimes(2)
      expect(buildDone).toHaveBeenCalledTimes(2)
    })
  } finally {
    await handle.watch.close()
    restoreCwd()
  }
})
