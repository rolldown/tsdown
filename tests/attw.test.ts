import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, test, type TestContext } from 'vitest'
import { writeFixtures } from './utils.ts'

const exec = promisify(execFile)
const cli = fileURLToPath(new URL('../src/run.ts', import.meta.url))
const config = new URL('../src/config.ts', import.meta.url).href

async function runAttw(
  context: TestContext,
  profile: 'strict' | 'node16' | 'esm-only',
  level: 'error' | 'warn' = 'error',
  extraOptions: Record<string, unknown> = {},
  importFrom = 'attw-profile-tsdown',
) {
  const { testDir } = await writeFixtures(context, {
    'package.json': JSON.stringify({
      name: 'attw-profile-tsdown',
      version: '1.0.0',
      type: 'module',
      files: ['client.d.ts', 'dist'],
      exports: {
        '.': './dist/index.mjs',
        './client': './client.d.ts',
        './package.json': './package.json',
      },
      scripts: { build: 'tsdown' },
      devDependencies: {
        '@arethetypeswrong/core': '0.18.5',
        tsdown: '0.23.1',
        typescript: '7.0.2',
      },
    }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        declaration: true,
        module: 'nodenext',
        strict: true,
        target: 'es2022',
      },
      include: ['src'],
    }),
    'tsdown.config.ts': `
      import { defineConfig } from ${JSON.stringify(config)}
      export default defineConfig({
        attw: ${JSON.stringify({ profile, level, ...extraOptions })},
        dts: true,
        entry: ['src/index.ts'],
      })
    `,
    'src/index.ts': `
      export interface Item { name: string }
      export const value = 1
    `,
    'client.d.ts': `
      declare module 'virtual:items' {
        import { type Item } from '${importFrom}'
        export const items: readonly Item[]
      }
    `,
  })
  try {
    const result = await exec(process.execPath, ['-C', 'dev', cli], {
      cwd: testDir,
      env: { ...process.env, NO_COLOR: '1' },
    })
    return { ...result, code: 0, testDir }
  } catch (error) {
    const result = error as Error & {
      code: number
      stdout: string
      stderr: string
    }
    return { ...result, testDir }
  }
}

describe('attw profiles', () => {
  test('esm-only ignores file problems confined to node10', async (context) => {
    const result = await runAttw(context, 'esm-only')
    expect(result.code, result.stderr).toBe(0)
    expect(result.stdout).toContain('No problems found')
    expect(result.stderr).not.toContain('Internal resolution error')
    expect(
      await readFile(path.join(result.testDir, 'dist/index.mjs'), 'utf8'),
    ).toContain('value')
  })

  test('node16 ignores node10 but keeps required CJS failures', async (context) => {
    const result = await runAttw(context, 'node16')
    expect(result.code, result.stderr).toBe(1)
    expect(result.stderr).toContain('CJS resolves to ESM (node16-cjs)')
    expect(result.stderr).not.toContain('Internal resolution error')
  })

  test('strict keeps file problems from every resolution', async (context) => {
    const result = await runAttw(context, 'strict')
    expect(result.code, result.stderr).toBe(1)
    expect(result.stderr).toContain('Internal resolution error')
    expect(result.stderr).toContain('(node10)')
  })

  test('esm-only also suppresses ignored file problems at warn level', async (context) => {
    const result = await runAttw(context, 'esm-only', 'warn')
    expect(result.code, result.stderr).toBe(0)
    expect(result.stdout).toContain('No problems found')
    expect(result.stderr).not.toContain('Internal resolution error')
  })

  test('warn reports required file problems without failing the build', async (context) => {
    const result = await runAttw(context, 'strict', 'warn')
    expect(result.code, result.stderr).toBe(0)
    expect(result.stderr).toContain('Internal resolution error')
    expect(result.stdout).not.toContain('No problems found')
  })

  test('esm-only keeps file problems affecting a required resolution', async (context) => {
    const result = await runAttw(
      context,
      'esm-only',
      'error',
      {},
      'attw-profile-tsdown/missing',
    )
    expect(result.code, result.stderr).toBe(1)
    expect(result.stderr).toContain('Internal resolution error')
    expect(result.stderr).toContain('Module: attw-profile-tsdown/missing')
  })

  test('explicit ignored rules still take priority', async (context) => {
    const result = await runAttw(context, 'strict', 'error', {
      ignoreRules: [
        'no-resolution',
        'cjs-resolves-to-esm',
        'internal-resolution-error',
      ],
    })
    expect(result.code, result.stderr).toBe(0)
    expect(result.stdout).toContain('No problems found')
  })
})
