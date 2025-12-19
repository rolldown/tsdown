import { realpathSync } from 'node:fs'
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
  const monorepoFixture = join(fixturesDir, 'fixtures/issue-452')
  const originalCwd = process.cwd()

  afterEach(() => {
    packageJsonCwds.length = 0
    tsupConfigCwds.length = 0
    process.chdir(originalCwd)
    vi.clearAllMocks()
  })

  test('migrates current directory when no dirs provided', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    const pkg1Dir = realpathSync(join(monorepoFixture, 'packages/pkg1'))

    process.chdir(pkg1Dir)
    await migrate({ dryRun: true })

    expect(packageJsonCwds.toSorted()).toEqual([pkg1Dir].toSorted())
    expect(tsupConfigCwds.toSorted()).toEqual([pkg1Dir].toSorted())
  })

  test('migrates packages matching glob pattern', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    const pkg1Dir = realpathSync(join(monorepoFixture, 'packages/pkg1'))
    const pkg2Dir = realpathSync(join(monorepoFixture, 'packages/pkg2'))
    const pkg3Dir = realpathSync(join(monorepoFixture, 'apps/pkg3'))

    process.chdir(monorepoFixture)
    await migrate({ dirs: ['packages/*', 'apps/*'], dryRun: true })

    expect(packageJsonCwds.toSorted()).toEqual(
      [pkg1Dir, pkg2Dir, pkg3Dir].toSorted(),
    )
    expect(tsupConfigCwds.toSorted()).toEqual(
      [pkg1Dir, pkg2Dir, pkg3Dir].toSorted(),
    )
  })

  test('migrates multiple explicitly specified dirs', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    const pkg1Dir = realpathSync(join(monorepoFixture, 'packages/pkg1'))
    const pkg3Dir = realpathSync(join(monorepoFixture, 'apps/pkg3'))

    process.chdir(monorepoFixture)
    await migrate({
      dirs: ['packages/pkg1', 'apps/pkg3'],
      dryRun: true,
    })

    expect(packageJsonCwds.toSorted()).toEqual([pkg1Dir, pkg3Dir].toSorted())
    expect(tsupConfigCwds.toSorted()).toEqual([pkg1Dir, pkg3Dir].toSorted())
  })

  test('migrates single explicitly specified dir', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    const pkg3Dir = realpathSync(join(monorepoFixture, 'apps/pkg3'))

    process.chdir(monorepoFixture)
    await migrate({ dirs: ['apps/pkg3'], dryRun: true })

    expect(packageJsonCwds).toEqual([pkg3Dir])
    expect(tsupConfigCwds).toEqual([pkg3Dir])
  })

  test('exits with error when dirs do not match any directory', async () => {
    vi.resetModules()
    const { migrate } = await import('../src/index.ts')

    process.chdir(monorepoFixture)
    process.exitCode = 0
    await migrate({ dirs: ['non-existent/*', 'also-not-found'], dryRun: true })

    expect(process.exitCode).toBe(1)
    expect(packageJsonCwds).toEqual([])
    expect(tsupConfigCwds).toEqual([])
  })
})
