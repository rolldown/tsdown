import { styleText } from 'node:util'

/**
 * The color/style names that Node's `styleText` knows how to apply.
 */
export type StyleTextFormat = Parameters<typeof styleText>[0]

type StyleValue = string | TemplateStringsArray

/**
 * A tiny convenience wrapper around `styleText`.
 * It keeps call sites compact and supports the tag style that `ansis` used,
 * so existing messages can stay readable while using Node's built-in styling.
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
 * Style text when the format is chosen at runtime.
 * Prefer the named helpers below for fixed colors like `blue('text')`.
 */
export function colorize(format: StyleTextFormat, text: string): string {
  return styleText(format, text)
}

function createStyler(format: StyleTextFormat): Styler {
  return ((value: StyleValue, ...values: unknown[]) =>
    styleText(format, getText(value, values))) as Styler
}

/**
 * colors
 */
export const bgRed: Styler = createStyler('bgRed')
export const bgYellow: Styler = createStyler('bgYellow')
export const blue: Styler = createStyler('blue')
export const bold: Styler = createStyler('bold')
export const dim: Styler = createStyler('dim')
export const green: Styler = createStyler('green')
export const red: Styler = createStyler('red')
export const underline: Styler = createStyler('underline')
export const yellow: Styler = createStyler('yellow')
