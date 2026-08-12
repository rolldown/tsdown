import { spawnSync } from 'node:child_process'
import { access, cp, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, test } from 'vitest'

const cliPath = path.resolve(import.meta.dirname, '../src/run.ts')
const fixturesPath = path.resolve(import.meta.dirname, 'fixtures/monorepo')
const temporaryDirectories: string[] = []

async function createFixture(relativePath: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'tsdown-migrate-'))
  temporaryDirectories.push(directory)
  await cp(path.join(fixturesPath, relativePath), directory, {
    recursive: true,
  })
  return directory
}

function runMigration(cwd: string, args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5_000,
  })
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe('non-interactive CLI', () => {
  test('requires explicit confirmation before changing files', async () => {
    const directory = await createFixture('packages/pkg1')
    const packageJsonPath = path.join(directory, 'package.json')
    const packageJson = await readFile(packageJsonPath, 'utf8')

    const result = runMigration(directory, [])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Non-interactive migration requires explicit confirmation. Re-run with --yes.',
    )
    expect(result.stderr).not.toContain('TTY initialization failed')
    expect(await readFile(packageJsonPath, 'utf8')).toBe(packageJson)
    await expect(
      access(path.join(directory, 'tsdown.config.ts')),
    ).rejects.toThrow()
  })

  test('migrates without prompts when installation is skipped', async () => {
    const directory = await createFixture('packages/pkg1')

    const result = runMigration(directory, ['--yes', '--no-install'])

    expect(result.status).toBe(0)

    const packageJson = JSON.parse(
      await readFile(path.join(directory, 'package.json'), 'utf8'),
    )
    expect(packageJson.devDependencies).toHaveProperty('tsdown')
    expect(packageJson.devDependencies).not.toHaveProperty('tsup')
    await expect(
      access(path.join(directory, 'tsdown.config.ts')),
    ).resolves.toBeUndefined()
    await expect(
      access(path.join(directory, 'tsup.config.ts')),
    ).rejects.toThrow()
  })

  test('fails before changing files when no package manager is detected', async () => {
    const directory = await createFixture('packages/pkg1')
    const packageJsonPath = path.join(directory, 'package.json')
    const packageJson = await readFile(packageJsonPath, 'utf8')

    const result = runMigration(directory, ['--yes'])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'Unable to detect a package manager in a non-interactive environment.',
    )
    expect(await readFile(packageJsonPath, 'utf8')).toBe(packageJson)
    await expect(
      access(path.join(directory, 'tsdown.config.ts')),
    ).rejects.toThrow()
  })

  test('uses an explicitly selected package manager', async () => {
    const directory = await createFixture('packages/pkg1')

    const result = runMigration(directory, [
      '--dry-run',
      '--package-manager',
      'pnpm',
    ])
    const output = `${result.stdout}${result.stderr}`

    expect(result.status).toBe(0)
    expect(output).not.toContain('Choose the agent')
    expect(output).not.toContain('TTY initialization failed')
  })

  test('auto-detects the package manager', async () => {
    const directory = await createFixture('apps/pkg3')

    const result = runMigration(directory, ['--dry-run'])
    const output = `${result.stdout}${result.stderr}`

    expect(result.status).toBe(0)
    expect(output).not.toContain('Choose the agent')
    expect(output).not.toContain('TTY initialization failed')
  })

  test('rejects an unsupported package manager', async () => {
    const directory = await createFixture('packages/pkg1')

    const result = runMigration(directory, [
      '--dry-run',
      '--package-manager',
      'invalid',
    ])

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unsupported package manager "invalid".')
  })
})
