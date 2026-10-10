import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test, type TestContext } from 'vitest'
import { getTestDir } from '../../tests/utils.ts'
import { resolveWorkspace } from './workspace.ts'
import type { UserConfigFnContext, Workspace } from './types.ts'

const context: UserConfigFnContext = {
  ci: false,
  watch: {
    restart: () => Promise.reject(new Error('not watching')),
    close: () => Promise.resolve(),
  },
}

async function writeTree(
  testContext: TestContext,
  files: Record<string, string>,
  directories: string[] = [],
): Promise<string> {
  const rootCwd = getTestDir(testContext.task)
  await Promise.all(
    directories.map((dir) =>
      mkdir(path.resolve(rootCwd, dir), { recursive: true }),
    ),
  )
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const filePath = path.resolve(rootCwd, file)
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(filePath, content)
    }),
  )
  return rootCwd
}

function config(name: string) {
  return JSON.stringify({ name })
}

async function resolveNames(
  rootCwd: string,
  workspace: Workspace,
): Promise<(string | undefined)[]> {
  const { configs } = await resolveWorkspace(
    { workspace, cwd: rootCwd },
    {},
    context,
  )
  return configs.map((resolved) => resolved.name).toSorted()
}

describe('workspace include filter', () => {
  test('drops matched directories without package.json or tsdown config', async (testContext) => {
    const rootCwd = await writeTree(
      testContext,
      {
        'pkgs/a/package.json': JSON.stringify({ name: 'a' }),
        'pkgs/a/tsdown.config.json': config('a'),
        'pkgs/b/tsdown.config.json': config('b'),
      },
      ['pkgs/ghost'],
    )

    await expect(
      resolveNames(rootCwd, { include: ['pkgs/*'] }),
    ).resolves.toEqual(['a', 'b'])
  })

  test('keeps a directory whose only marker is package.json', async (testContext) => {
    const rootCwd = await writeTree(
      testContext,
      { 'pkgs/a/package.json': JSON.stringify({ name: 'a' }) },
      ['pkgs/ghost'],
    )

    const { configs } = await resolveWorkspace(
      { workspace: { include: ['pkgs/*'] }, cwd: rootCwd },
      {},
      context,
    )
    expect(configs).toHaveLength(1)
  })

  test('keeps every matched directory when workspace.config is a file path', async (testContext) => {
    const rootCwd = await writeTree(
      testContext,
      {
        'pkgs/a/package.json': JSON.stringify({ name: 'a' }),
        'shared.config.json': config('shared'),
      },
      ['pkgs/ghost'],
    )

    const { configs } = await resolveWorkspace(
      {
        workspace: {
          include: ['pkgs/*'],
          config: path.resolve(rootCwd, 'shared.config.json'),
        },
        cwd: rootCwd,
      },
      {},
      context,
    )
    expect(configs.map((resolved) => resolved.name)).toEqual([
      'shared',
      'shared',
    ])
  })

  test('reports how many directories were skipped when none survive', async (testContext) => {
    const rootCwd = await writeTree(testContext, {}, [
      'pkgs/ghost',
      'pkgs/other',
    ])

    await expect(
      resolveWorkspace({ workspace: ['pkgs/*'], cwd: rootCwd }, {}, context),
    ).rejects.toThrow(
      'No workspace packages found, please check your config (2 matched directories contain no package.json or tsdown config)',
    )
  })

  test('keeps the original message when the globs match nothing', async (testContext) => {
    const rootCwd = await writeTree(testContext, {}, ['pkgs'])

    await expect(
      resolveWorkspace({ workspace: ['pkgs/*'], cwd: rootCwd }, {}, context),
    ).rejects.toThrow('No workspace packages found, please check your config')
  })

  test('leaves the auto branch alone', async (testContext) => {
    const rootCwd = await writeTree(
      testContext,
      {
        'package.json': JSON.stringify({ name: 'root' }),
        'pkgs/a/package.json': JSON.stringify({ name: 'a' }),
        'pkgs/a/tsdown.config.json': config('a'),
      },
      ['pkgs/ghost'],
    )

    await expect(resolveNames(rootCwd, { include: 'auto' })).resolves.toEqual([
      'a',
    ])
  })
})
