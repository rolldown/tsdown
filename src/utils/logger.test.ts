import { describe, expect, test, vi } from 'vitest'
import {
  createLogger,
  getNameLabel,
  LogLevels,
  prettyFormat,
} from './logger.ts'

describe('LogLevels', () => {
  test('has correct numeric ordering', () => {
    expect(LogLevels.silent).toBe(0)
    expect(LogLevels.error).toBe(1)
    expect(LogLevels.warn).toBe(2)
    expect(LogLevels.info).toBe(3)
  })

  test('silent < error < warn < info', () => {
    expect(LogLevels.silent).toBeLessThan(LogLevels.error)
    expect(LogLevels.error).toBeLessThan(LogLevels.warn)
    expect(LogLevels.warn).toBeLessThan(LogLevels.info)
  })
})

describe('createLogger', () => {
  test('returns custom logger when provided', () => {
    const custom = {
      level: 'info' as const,
      info: vi.fn(),
      warn: vi.fn(),
      warnOnce: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      clearScreen: vi.fn(),
    }
    const logger = createLogger('info', { customLogger: custom })
    expect(logger).toBe(custom)
  })

  test('respects silent log level', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('silent', {
      console: mockConsole as unknown as Console,
    })

    logger.info('test')
    logger.warn('test')
    logger.error('test')

    expect(mockConsole.log).not.toHaveBeenCalled()
    expect(mockConsole.warn).not.toHaveBeenCalled()
    expect(mockConsole.error).not.toHaveBeenCalled()
  })

  test('error level only outputs errors', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('error', {
      console: mockConsole as unknown as Console,
    })

    logger.info('info msg')
    logger.warn('warn msg')
    logger.error('error msg')

    expect(mockConsole.log).not.toHaveBeenCalled()
    expect(mockConsole.warn).not.toHaveBeenCalled()
    expect(mockConsole.error).toHaveBeenCalledOnce()
  })

  test('warn level outputs warnings and errors', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('warn', {
      console: mockConsole as unknown as Console,
    })

    logger.info('info msg')
    logger.warn('warn msg')
    logger.error('error msg')

    expect(mockConsole.log).not.toHaveBeenCalled()
    expect(mockConsole.warn).toHaveBeenCalledOnce()
    expect(mockConsole.error).toHaveBeenCalledOnce()
  })

  test('info level outputs all messages', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
    })

    logger.info('info msg')
    logger.warn('warn msg')
    logger.error('error msg')
    logger.success('success msg')

    expect(mockConsole.log).toHaveBeenCalledTimes(2) // info + success
    expect(mockConsole.warn).toHaveBeenCalledOnce()
    expect(mockConsole.error).toHaveBeenCalledOnce()
  })

  test('warnOnce only warns once for the same message', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
    })

    logger.warnOnce('duplicate warning')
    logger.warnOnce('duplicate warning')

    expect(mockConsole.warn).toHaveBeenCalledOnce()
  })

  test('failOnWarn routes warnings to error', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      failOnWarn: true,
    })

    logger.warn('should be error')

    expect(mockConsole.warn).not.toHaveBeenCalled()
    expect(mockConsole.error).toHaveBeenCalledOnce()
  })

  test('failOnWarn routes warnOnce to error', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      failOnWarn: true,
    })

    logger.warnOnce('should be error')

    expect(mockConsole.warn).not.toHaveBeenCalled()
    expect(mockConsole.error).toHaveBeenCalledOnce()
  })

  test('default level is info', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger(undefined, {
      console: mockConsole as unknown as Console,
    })

    expect(logger.level).toBe('info')
  })
})

describe('suppressWarnings', () => {
  test('suppresses warning matching a string (substring match)', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: 'deprecated',
    })

    logger.warn('this feature is deprecated now')

    expect(mockConsole.warn).not.toHaveBeenCalled()
  })

  test('does not suppress a non-matching warning', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: 'deprecated',
    })

    logger.warn('something else happened')

    expect(mockConsole.warn).toHaveBeenCalledOnce()
  })

  test('suppresses warning matching a RegExp', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: /circular\s+dependency/i,
    })

    logger.warn('Detected Circular Dependency in module')

    expect(mockConsole.warn).not.toHaveBeenCalled()
  })

  test('suppresses when any pattern in the array matches', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: ['foo', /bar/],
    })

    logger.warn('message about bar')
    expect(mockConsole.warn).not.toHaveBeenCalled()

    logger.warn('unrelated message')
    expect(mockConsole.warn).toHaveBeenCalledOnce()
  })

  test('suppresses via a predicate function', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: (msg) => msg.startsWith('IGNORE:'),
    })

    logger.warn('IGNORE: this one')
    expect(mockConsole.warn).not.toHaveBeenCalled()

    logger.warn('keep this one')
    expect(mockConsole.warn).toHaveBeenCalledOnce()
  })

  test('applies to warnOnce', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: 'suppressed once',
    })

    logger.warnOnce('a suppressed once message')

    expect(mockConsole.warn).not.toHaveBeenCalled()
  })

  test('takes precedence over failOnWarn (not routed to error)', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      failOnWarn: true,
      suppressWarnings: 'silence me',
    })

    logger.warn('please silence me')

    expect(mockConsole.warn).not.toHaveBeenCalled()
    expect(mockConsole.error).not.toHaveBeenCalled()
  })

  test('does not suppress errors', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
      suppressWarnings: 'boom',
    })

    logger.error('boom happened')

    expect(mockConsole.error).toHaveBeenCalledOnce()
  })

  test('warns normally when suppressWarnings is not set', () => {
    const mockConsole = { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const logger = createLogger('info', {
      console: mockConsole as unknown as Console,
    })

    logger.warn('a normal warning')

    expect(mockConsole.warn).toHaveBeenCalledOnce()
  })
})

describe('getNameLabel', () => {
  test('returns undefined for empty name', () => {
    const ansis = (s: string) => s
    expect(getNameLabel(ansis as any)).toBeUndefined()
    expect(getNameLabel(ansis as any, '')).toBeUndefined()
  })

  test('wraps name in brackets using ansis', () => {
    const ansis = (s: string) => `styled:${s}`
    expect(getNameLabel(ansis as any, 'mylib')).toBe('styled:[mylib]')
  })
})

describe('prettyFormat', () => {
  test('formats es as ESM', () => {
    const result = prettyFormat('es')
    expect(result).toContain('ESM')
  })

  test('formats cjs as CJS', () => {
    const result = prettyFormat('cjs')
    expect(result).toContain('CJS')
  })

  test('formats iife as IIFE', () => {
    const result = prettyFormat('iife')
    expect(result).toContain('IIFE')
  })
})
