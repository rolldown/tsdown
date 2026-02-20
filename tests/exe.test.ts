import { execFileSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import ansis from 'ansis'
import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

function parseNodeVersion(version: string): [number, number, number] {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) return [0, 0, 0]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

const [major, minor, patch] = parseNodeVersion(process.version)
const nodeSupportsBuiltinSea =
  major > 25 || (major === 25 && (minor > 5 || (minor === 5 && patch >= 0)))

describe('exe format', () => {
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
          format: 'exe',
        },
      }),
    ).rejects.toThrow(/exe.*format requires exactly one entry/)
  })

  describe.runIf(nodeSupportsBuiltinSea)('e2e (Node >= 25.5.0)', () => {
    test('exe runs and produces correct output', async (context) => {
      const { testDir } = await testBuild({
        context,
        files: {
          'index.ts': 'console.log("hello from sea")',
        },
        options: {
          format: 'exe',
        },
      })

      const exePath = path.join(testDir, 'index')
      const result = execFileSync(exePath, { encoding: 'utf8' })
      expect(result.trim()).toBe('hello from sea')
    })

    test('exe build terminal output', async (context) => {
      const logs: string[] = []
      const capture = (...args: any[]) => {
        logs.push(args.filter(Boolean).join(' '))
      }
      const { testDir } = await testBuild({
        context,
        files: {
          'index.ts': 'console.log("hello")',
        },
        options: {
          format: 'exe',
          logLevel: 'info',
          customLogger: {
            level: 'info',
            info: capture,
            warn: capture,
            warnOnce: capture,
            error: capture,
            success: capture,
            clearScreen: () => {},
          },
        },
      })
      const output = logs.map((l) =>
        ansis
          .strip(l)
          .replace(testDir, '<root>')
          .replace(/\d+ms/, '<t>ms')
          .replace(/\d+\.\d+ [kM]B/, '<size>')
          .replace(/node\d+\.\d+\.\d+/, 'node<version>')
          .replaceAll('index.exe', 'index'),
      )
      expect(output).toMatchInlineSnapshot(`
        [
          "entry: index.ts",
          "target: node<version>",
          "Build complete in <t>ms",
          "\`exe\` format is experimental and may change in future releases.",
          "index  <size>",
          "SEA executable: index (<t>ms)",
        ]
      `)
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
        options: {
          format: 'exe',
        },
      })

      const exePath = path.join(testDir, 'index')
      const result = execFileSync(exePath, { encoding: 'utf8' })
      expect(result.trim()).toBe('hello from dynamic import')
    })
  })
})
