import process from 'node:process'
import readline from 'node:readline'
import { bold, dim } from 'ansis'
import { globalLogger } from '../utils/logger.ts'

// Copied from https://github.com/vitejs/vite/blob/main/packages/vite/src/node/shortcuts.ts - MIT License

export interface Shortcut {
  key: string
  description: string
  action: () => void | Promise<void>
}

export function shortcuts(restart: () => void): () => void {
  let actionRunning = false
  async function onInput(input: string) {
    if (actionRunning) return
    input = input.trim().toLowerCase()
    const SHORTCUTS: Shortcut[] = [
      {
        key: 'r',
        description: 'reload config and rebuild',
        action() {
          restart()
        },
      },
      {
        key: 'c',
        description: 'clear console',
        action() {
          console.clear()
        },
      },
      {
        key: 'q',
        description: 'quit',
        action() {
          process.exit(0)
        },
      },
    ]

    if (input === 'h') {
      const loggedKeys = new Set<string>()
      globalLogger.info('  Shortcuts')

      for (const shortcut of SHORTCUTS) {
        if (loggedKeys.has(shortcut.key)) continue
        loggedKeys.add(shortcut.key)

        if (shortcut.action == null) continue

        globalLogger.info(
          dim`  press ` +
          bold`${shortcut.key} + enter` +
          dim` to ${shortcut.description}`,
        )
      }

      return
    }

    const shortcut = SHORTCUTS.find((shortcut) => shortcut.key === input)
    if (!shortcut) return

    actionRunning = true
    await shortcut.action()
    actionRunning = false
  }

  const rl = readline.createInterface({
    input: process.stdin,
  })
  rl.on('line', onInput)
  return () => rl.close()
}
