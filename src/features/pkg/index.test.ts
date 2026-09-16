import { Buffer } from 'node:buffer'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test, vi } from 'vitest'
import { fsRemove } from '../../utils/fs.ts'
import { packTarball } from './index.ts'

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b])

async function writeTempPackage() {
  const dir = await mkdtemp(path.join(tmpdir(), 'tsdown-pack-fixture-'))
  await Promise.all([
    writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'tsdown-pack-fixture',
        version: '0.0.0',
        files: ['index.js'],
      }),
    ),
    // forces `npm` as the detected package manager
    writeFile(
      path.join(dir, 'package-lock.json'),
      JSON.stringify({ lockfileVersion: 3 }),
    ),
    writeFile(path.join(dir, 'index.js'), 'module.exports = 1\n'),
  ])
  return dir
}

test('packs a tarball', async () => {
  const dir = await writeTempPackage()
  try {
    const tarball = await packTarball(path.join(dir, 'package.json'))
    expect(tarball.subarray(0, 2)).toEqual(GZIP_MAGIC)
  } finally {
    await fsRemove(dir)
  }
})

test('packs a tarball inside `npm publish --dry-run`', async () => {
  vi.stubEnv('npm_config_dry_run', 'true')
  const dir = await writeTempPackage()
  try {
    const tarball = await packTarball(path.join(dir, 'package.json'))
    expect(tarball.subarray(0, 2)).toEqual(GZIP_MAGIC)
  } finally {
    await fsRemove(dir)
    vi.unstubAllEnvs()
  }
})
