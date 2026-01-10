import path from 'node:path'
import process from 'node:process'
import consola from 'consola'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { migrate } from '../src/index.ts'

const packageJsonCwds = vi.hoisted<string[]>(() => [])
const tsupConfigCwds = vi.hoisted<string[]>(() => [])

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

describe('migrate monorepo', () => {
  const monorepoFixture = path.resolve(import.meta.dirname, 'fixtures/monorepo')
  const originalCwd = process.cwd()

  afterEach(() => {
    packageJsonCwds.length = 0
    tsupConfigCwds.length = 0
    process.chdir(originalCwd)
    vi.clearAllMocks()
  })

  test('migrates current directory when no dirs provided', async () => {
    const pkg1Dir = path.resolve(monorepoFixture, 'packages/pkg1')

    process.chdir(pkg1Dir)
    await migrate({
      dryRun: true,
    })

    expect(packageJsonCwds).toEqual([pkg1Dir])
    expect(tsupConfigCwds).toEqual([pkg1Dir])
  })

  test('migrates packages matching glob pattern', async () => {
    const pkg1Dir = path.resolve(monorepoFixture, 'packages/pkg1')
    const pkg2Dir = path.resolve(monorepoFixture, 'packages/pkg2')
    const pkg3Dir = path.resolve(monorepoFixture, 'apps/pkg3')

    process.chdir(monorepoFixture)
    await migrate({
      dirs: ['packages/*', 'apps/*'],
      dryRun: true,
    })

    expect(packageJsonCwds.toSorted()).toEqual(
      [pkg1Dir, pkg2Dir, pkg3Dir].toSorted(),
    )
    expect(tsupConfigCwds.toSorted()).toEqual(
      [pkg1Dir, pkg2Dir, pkg3Dir].toSorted(),
    )
  })

  test('migrates multiple explicitly specified dirs', async () => {
    const pkg1Dir = path.resolve(monorepoFixture, 'packages/pkg1')
    const pkg3Dir = path.resolve(monorepoFixture, 'apps/pkg3')

    process.chdir(monorepoFixture)
    await migrate({
      dirs: ['packages/pkg1', 'apps/pkg3'],
      dryRun: true,
    })

    expect(packageJsonCwds.toSorted()).toEqual([pkg1Dir, pkg3Dir].toSorted())
    expect(tsupConfigCwds.toSorted()).toEqual([pkg1Dir, pkg3Dir].toSorted())
  })

  test('migrates single explicitly specified dir', async () => {
    const pkg3Dir = path.resolve(monorepoFixture, 'apps/pkg3')

    process.chdir(monorepoFixture)
    await migrate({
      dirs: ['apps/pkg3'],
      dryRun: true,
    })

    expect(packageJsonCwds).toEqual([pkg3Dir])
    expect(tsupConfigCwds).toEqual([pkg3Dir])
  })

  test('exits with error when dirs do not match any directory', async () => {
    const error = vi.spyOn(consola, 'error').mockImplementation(() => {})

    process.chdir(monorepoFixture)
    process.exitCode = 0
    await migrate({
      dirs: ['non-existent/*', 'also-not-found'],
      dryRun: true,
    })

    expect(process.exitCode).toBe(1)
    expect(packageJsonCwds).toEqual([])
    expect(tsupConfigCwds).toEqual([])
    expect(error).toHaveBeenCalledWith(
      'No directories matched: non-existent/*, also-not-found',
    )

    error.mockRestore()
  })
})
