import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test, vi } from 'vitest'

const packageJsonCwds = vi.hoisted(() => [] as string[])
const tsupConfigCwds = vi.hoisted(() => [] as string[])

vi.mock('../src/helpers/package-json.ts', () => ({
  migratePackageJson: vi.fn(() => {
    packageJsonCwds.push(process.cwd())
    return true
  }),
}))

vi.mock('../src/helpers/tsup-config.ts', () => ({
  migrateTsupConfig: vi.fn(() => {
    tsupConfigCwds.push(process.cwd())
    return true
  }),
}))

describe('issue-452', () => {
  const fixturesDir = fileURLToPath(new URL('.', import.meta.url))
  const monorepoFixture = join(fixturesDir, 'fixtures/issue-452/monorepo')
  const internalPackageFixture = join(
    fixturesDir,
    'fixtures/issue-452/monorepo/packages/pkg2',
  )
  const standaloneFixture = join(fixturesDir, 'fixtures/issue-452/standalone')
  const originalCwd = process.cwd()

  afterEach(() => {
    packageJsonCwds.length = 0
    tsupConfigCwds.length = 0
    process.chdir(originalCwd)
    vi.clearAllMocks()
  })

  test('migrates each package in a pnpm workspace', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    await migrate({ cwd: monorepoFixture, dryRun: true })

    const expectedCwds = [
      monorepoFixture,
      join(monorepoFixture, 'packages/pkg1'),
      join(monorepoFixture, 'packages/pkg2'),
    ]

    expect(packageJsonCwds).toEqual(expectedCwds)
    expect(tsupConfigCwds).toEqual(expectedCwds)
  })

  test('migrates only the current package when run inside a workspace package', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    await migrate({ cwd: internalPackageFixture, dryRun: true })

    expect(packageJsonCwds).toEqual([internalPackageFixture])
    expect(tsupConfigCwds).toEqual([internalPackageFixture])
  })

  test('migrates a standalone package outside any workspace', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    const tmpRoot = mkdtempSync(join(tmpdir(), 'tsdown-standalone-'))
    const standaloneDir = join(tmpRoot, 'pkg')
    cpSync(standaloneFixture, standaloneDir, { recursive: true })
    const resolvedStandaloneDir = realpathSync(standaloneDir)

    try {
      await migrate({ cwd: resolvedStandaloneDir, dryRun: true })
    } finally {
      process.chdir(originalCwd)
      rmSync(tmpRoot, { recursive: true, force: true })
    }

    expect(packageJsonCwds).toEqual([resolvedStandaloneDir])
    expect(tsupConfigCwds).toEqual([resolvedStandaloneDir])
  })
})
