import { styleText } from 'node:util'

/**
 * Formats accepted by Node.js `util.styleText`.
 */
export type StyleTextFormat = Parameters<typeof styleText>[0]

type StyleValue = string | TemplateStringsArray

/**
 * Small `styleText` wrapper that supports both function and template-tag calls.
 */
export type Styler = {
  (text: string): string
  (strings: TemplateStringsArray, ...values: unknown[]): string
}

function getText(value: StyleValue, values: unknown[]): string {
  if (typeof value === 'string') {
    return value
  }

  let text = value[0]
  for (let i = 0; i < values.length; i++) {
    text += String(values[i]) + value[i + 1]
  }
  return text
}

/**
 * Apply a dynamic style format to text.
 */
export function colorize(format: StyleTextFormat, text: string): string {
  return styleText(format, text)
}

function createStyler(format: StyleTextFormat): Styler {
  return ((value: StyleValue, ...values: unknown[]) =>
    styleText(format, getText(value, values))) as Styler
}

export const bgRed: Styler = createStyler('bgRed')
export const bgYellow: Styler = createStyler('bgYellow')
export const blue: Styler = createStyler('blue')
export const bold: Styler = createStyler('bold')
export const dim: Styler = createStyler('dim')
export const green: Styler = createStyler('green')
export const red: Styler = createStyler('red')
export const underline: Styler = createStyler('underline')
export const yellow: Styler = createStyler('yellow')
