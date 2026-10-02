import fs from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { fsExists, fsRemove } from '../utils/fs.ts'
import { cleanOutDir, resolveClean } from './clean.ts'
import type { ResolvedConfig, UserConfig } from '../config/index.ts'

let cwd: string

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), 'tsdown-clean-'))
})

afterEach(async () => {
  vi.restoreAllMocks()
  syncBuiltinESMExports()
  await fsRemove(cwd)
})

async function writeFiles(files: string[]) {
  for (const file of files) {
    const filePath = path.join(cwd, file)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, '')
  }
}

async function clean(outDir: string, clean: UserConfig['clean']) {
  const resolvedOutDir = path.resolve(cwd, outDir)
  const config: Partial<ResolvedConfig> = {
    cwd,
    outDir: resolvedOutDir,
    clean: resolveClean(clean, resolvedOutDir, cwd),
  }
  // Patch the CommonJS module and sync the ESM bindings so the spy sees the
  // directory reads made inside tinyglobby
  const readdir = vi.spyOn(fs, 'readdir')
  syncBuiltinESMExports()
  await cleanOutDir([config as ResolvedConfig])
  return readdir.mock.calls.map(([dir]) =>
    path.relative(cwd, String(dir)).replaceAll('\\', '/'),
  )
}

describe('cleanOutDir', () => {
  test('lists only the default output directory', async () => {
    await writeFiles(['dist/old.js', 'dist/nested/old.js', 'sibling.txt'])

    const listed = await clean('dist', true)

    expect(listed.toSorted()).toEqual(['dist', 'dist/nested'])
    expect(await fsExists(path.join(cwd, 'dist'))).toBe(true)
    expect(await fsExists(path.join(cwd, 'dist/old.js'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'dist/nested'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'sibling.txt'))).toBe(true)
  })

  test('lists only a nested custom output directory', async () => {
    await writeFiles(['out/lib/old.js', 'out/other.js'])

    const listed = await clean('out/lib', true)

    expect(listed).toEqual(['out/lib'])
    expect(await fsExists(path.join(cwd, 'out/lib/old.js'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'out/other.js'))).toBe(true)
  })

  test('does not list anything outside a missing output directory', async () => {
    const listed = await clean('dist', true)

    expect(listed).toEqual(['dist'])
  })

  test('still removes other custom patterns', async () => {
    await writeFiles(['dist/old.js', 'temp/old.js', 'app.log', 'keep.js'])

    await clean('dist', ['dist', 'temp', '*.log'])

    expect(await fsExists(path.join(cwd, 'dist'))).toBe(true)
    expect(await fsExists(path.join(cwd, 'dist/old.js'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'temp'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'app.log'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'keep.js'))).toBe(true)
  })

  test('respects negated patterns', async () => {
    await writeFiles(['dist/old.js', 'dist/keep.js'])

    await clean('dist', ['dist', '!dist/keep.js'])

    expect(await fsExists(path.join(cwd, 'dist/old.js'))).toBe(false)
    expect(await fsExists(path.join(cwd, 'dist/keep.js'))).toBe(true)
  })
})
