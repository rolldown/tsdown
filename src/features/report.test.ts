import { describe, expect, test, vi } from 'vitest'
import { createLogger } from '../utils/logger.ts'
import { outputReport, type ReportOptions } from './report.ts'
import type { ResolvedConfig } from '../config/types.ts'
import type { OutputChunk } from 'rolldown'

function chunk(fileName: string, code: string): OutputChunk {
  return {
    type: 'chunk',
    fileName,
    code,
    isEntry: true,
  } as unknown as OutputChunk
}

async function report(report: ReportOptions) {
  const info = vi.fn()
  const config = {
    cwd: '/cwd',
    format: 'es',
    nameLabel: undefined,
    report,
    logger: { ...createLogger(), info },
  } as unknown as ResolvedConfig

  await outputReport(
    config,
    [chunk('a.js', 'a'), chunk('b.js', 'bb')],
    '/cwd/dist',
  )
  return info
}

describe('outputReport', () => {
  test('logs each file plus the total by default', async () => {
    const info = await report({ gzip: false })
    expect(info).toHaveBeenCalledTimes(3)
    expect(info.mock.calls.at(-1)!.join(' ')).toContain('2 files, total:')
  })

  test('logs only the total when summary is enabled', async () => {
    const info = await report({ gzip: false, summary: true })
    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls[0].join(' ')).toContain('2 files, total:')
  })
})
