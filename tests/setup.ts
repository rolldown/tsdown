import { afterEach, beforeEach, expect, vi } from 'vitest'
import { fsRemove } from '../src/utils/fs.ts'
import { getTestDir } from './utils.ts'

beforeEach(async (context) => {
  const dir = getTestDir(context.task)
  await fsRemove(dir)
})

const asserted: Set<string> = new Set()
const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

beforeEach(() => {
  asserted.clear()
})

afterEach(() => {
  const assertedArray = Array.from(asserted)
  const nonAssertedWarnings = warn.mock.calls
    .map((args) => args[0])
    .filter((received) => {
      return !assertedArray.some((assertedMsg) => {
        return received.includes(assertedMsg)
      })
    })
  warn.mockRestore()
  if (nonAssertedWarnings.length) {
    throw new Error(
      `test case threw unexpected warnings:\n - ${nonAssertedWarnings.join(
        '\n - ',
      )}`,
    )
  }
})

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface CustomMatchers<R = unknown> {
  toHaveBeenWarned: () => R
}

expect.extend({
  toHaveBeenWarned(received: string) {
    const passed = warn.mock.calls.some((args) => args[0].includes(received))
    if (passed) {
      asserted.add(received)
      return {
        pass: true,
        message: () => `expected "${received}" not to have been warned.`,
      }
    } else {
      const msgs = warn.mock.calls.map((args) => args[0]).join('\n - ')
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned${
            msgs.length
              ? `.\n\nActual messages:\n\n - ${msgs}`
              : ` but no warning was recorded.`
          }`,
      }
    }
  },
})
