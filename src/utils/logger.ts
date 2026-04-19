import process from 'node:process'
import readline from 'node:readline'
import { noop } from './general.ts'
import {
  bgRed,
  bgYellow,
  blue,
  colorize,
  green,
  yellow,
  type StyleTextFormat,
} from './style.ts'
import type { InternalModuleFormat } from 'rolldown'

export type LogType = 'error' | 'warn' | 'info'
export type LogLevel = LogType | 'silent'

export interface LoggerOptions {
  allowClearScreen?: boolean
  customLogger?: Logger
  console?: Console
  failOnWarn?: boolean
}

export const LogLevels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
}

export interface Logger {
  level: LogLevel
  options?: LoggerOptions
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  warnOnce: (...args: any[]) => void
  error: (...args: any[]) => void
  success: (...args: any[]) => void
  clearScreen: (type: LogType) => void
}

function format(msgs: any[]) {
  return msgs.filter((arg) => arg !== undefined && arg !== false).join(' ')
}

function clearScreen() {
  const repeatCount = process.stdout.rows - 2
  const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : ''
  console.info(blank)
  readline.cursorTo(process.stdout, 0, 0)
  readline.clearScreenDown(process.stdout)
}

const warnedMessages = new Set<string>()

export function createLogger(
  level: LogLevel = 'info',
  options: LoggerOptions = {},
): Logger {
  const resolvedOptions = {
    allowClearScreen: true,
    failOnWarn: false,
    console: globalThis.console,
    ...options,
  }
  /// keep-sorted
  const { allowClearScreen, console, customLogger, failOnWarn } =
    resolvedOptions

  if (customLogger) {
    return customLogger
  }

  function output(type: LogType, msg: string) {
    const thresh = LogLevels[logger.level]
    if (thresh < LogLevels[type]) return

    const method = type === 'info' ? 'log' : type
    console[method](msg)
  }

  const canClearScreen =
    allowClearScreen && process.stdout.isTTY && !process.env.CI
  const clear = canClearScreen ? clearScreen : () => {}

  const logger: Logger = {
    level,
    options: resolvedOptions,

    info(...msgs: any[]): void {
      output('info', `${blue`ℹ`} ${format(msgs)}`)
    },

    warn(...msgs: any[]): void {
      if (failOnWarn) {
        return this.error(...msgs)
      }
      const message = format(msgs)
      warnedMessages.add(message)
      output('warn', `\n${bgYellow` WARN `} ${message}\n`)
    },

    warnOnce(...msgs: any[]): void {
      const message = format(msgs)
      if (warnedMessages.has(message)) {
        return
      }

      if (failOnWarn) {
        return this.error(...msgs)
      }
      warnedMessages.add(message)

      output('warn', `\n${bgYellow` WARN `} ${message}\n`)
    },

    error(...msgs: any[]): void {
      output('error', `\n${bgRed` ERROR `} ${format(msgs)}\n`)
      process.exitCode = 1
    },

    success(...msgs: any[]): void {
      output('info', `${green`✔`} ${format(msgs)}`)
    },

    clearScreen(type) {
      if (LogLevels[logger.level] >= LogLevels[type]) {
        clear()
      }
    },
  }
  return logger
}

export const globalLogger: Logger = createLogger()

export function getNameLabel(
  color: StyleTextFormat,
  name?: string,
): string | undefined {
  if (!name) return undefined
  return colorize(color, `[${name}]`)
}

export function prettyFormat(format: InternalModuleFormat): string {
  const formatColor = format === 'es' ? blue : format === 'cjs' ? yellow : noop

  let formatText: string
  switch (format) {
    case 'es':
      formatText = 'ESM'
      break
    default:
      formatText = format.toUpperCase()
      break
  }

  return formatColor(`[${formatText}]`)
}

// Copied from https://github.com/antfu/vscode-pnpm-catalog-lens - MIT License
const colorPalette = [
  'blue',
  'green',
  'yellow',
  'magenta',
  'cyan',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
] satisfies StyleTextFormat[]

const colors = new Map<string, StyleTextFormat>()
export function generateColor(name: string = 'default'): StyleTextFormat {
  if (colors.has(name)) {
    return colors.get(name)!
  }
  let color: StyleTextFormat
  if (name === 'default') {
    color = 'blue'
  } else {
    let hash = 0
    for (let i = 0; i < name.length; i++)
      // eslint-disable-next-line unicorn/prefer-code-point
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    color = colorPalette[Math.abs(hash) % colorPalette.length]
  }
  colors.set(name, color)
  return color
}
