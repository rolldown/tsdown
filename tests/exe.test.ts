import path from 'node:path'
import process from 'node:process'
import { x } from 'tinyexec'
import { isGreaterOrEqual } from 'verkit'
import { describe, expect, test } from 'vitest'
import { NODE_SEA_MIN_VERSION_PARSED } from '../src/features/exe.ts'
import { testBuild } from './utils.ts'

const nodeSupportsBuiltinSea = isGreaterOrEqual(
  process.version,
  NODE_SEA_MIN_VERSION_PARSED,
)
const suffix = process.platform === 'win32' ? '.exe' : ''

describe.runIf(nodeSupportsBuiltinSea)('exe', () => {
  test('exe format throws on multiple entries', async (context) => {
    await expect(
      testBuild({
        context,
        files: {
          'a.ts': 'console.log("a")',
          'b.ts': 'console.log("b")',
        },
        options: {
          entry: ['a.ts', 'b.ts'],
          exe: true,
        },
      }),
    ).rejects.toThrow(
      'The `exe` feature currently only supports single entry points.',
    )
  })

  test('exe runs and produces correct output', async (context) => {
    const { testDir } = await testBuild({
      context,
      files: {
        'index.ts': 'console.log("hello from sea")',
      },
      options: { exe: true },
      snapshot: false,
    })

    const exePath = path.join(testDir, `build/index${suffix}`)
    const { stdout } = await x(exePath)
    expect(stdout.trim()).toBe('hello from sea')
  })

  test('exe.outDir outputs executable to custom directory', async (context) => {
    const { testDir } = await testBuild({
      context,
      files: {
        'index.ts': 'console.log("hello from custom outdir")',
      },
      options: { exe: true },
      snapshot: false,
    })

    const exePath = path.join(testDir, `build/index${suffix}`)
    const { stdout } = await x(exePath)
    expect(stdout.trim()).toBe('hello from custom outdir')
  })

  test('bundles dynamic import() and executes correctly', async (context) => {
    const { testDir } = await testBuild({
      context,
      files: {
        'index.ts': `
            async function main() {
              const { greet } = await import('./greet.ts')
              greet()
            }
            main()
          `,
        'greet.ts': `
            export function greet() {
              console.log("hello from dynamic import")
            }
          `,
      },
      options: { exe: true },
      snapshot: false,
    })

    const exePath = path.join(testDir, `build/index${suffix}`)
    const { stdout } = await x(exePath)
    expect(stdout.trim()).toBe('hello from dynamic import')
  })
})
