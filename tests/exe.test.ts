import path from 'node:path'
import process from 'node:process'
import satisfies from 'semver/functions/satisfies.js'
import { x } from 'tinyexec'
import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

const nodeSupportsBuiltinSea = satisfies(process.version, '>=25.5.0')
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
          // format: 'exe',
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

    const exePath = path.join(testDir, `dist/index${suffix}`)
    const { stdout } = await x(exePath)
    expect(stdout.trim()).toBe('hello from sea')
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

    const exePath = path.join(testDir, `dist/index${suffix}`)
    const { stdout } = await x(exePath)
    expect(stdout.trim()).toBe('hello from dynamic import')
  })
})
