import { Buffer } from 'node:buffer'
import { describe, expect, test, vi } from 'vitest'
import { attw, type AttwOptions } from './attw.ts'
import type { ResolvedConfig } from '../../config/types.ts'
import type {
  CheckResult,
  Problem,
  ResolutionKind,
} from '@arethetypeswrong/core'

const resolutionKinds: ResolutionKind[] = [
  'node10',
  'node16-cjs',
  'node16-esm',
  'bundler',
]

function createCheckResult(
  problems: [Problem, ResolutionKind[]][],
): CheckResult {
  return {
    packageName: 'pkg',
    packageVersion: '1.0.0',
    buildTools: {},
    types: { kind: 'included' },
    programInfo: {} as any,
    problems: problems.map(([problem]) => problem),
    entrypoints: {
      '.': {
        subpath: '.',
        hasTypes: true,
        isWildcard: false,
        resolutions: Object.fromEntries(
          resolutionKinds.map((resolutionKind) => [
            resolutionKind,
            {
              name: '.',
              resolutionKind,
              visibleProblems: problems.flatMap(([, kinds], index) =>
                kinds.includes(resolutionKind) ? [index] : [],
              ),
            },
          ]),
        ) as any,
      },
    },
  }
}

async function runAttw(
  checkResult: CheckResult,
  attwOptions: Omit<AttwOptions, 'module'>,
) {
  const logger = { warn: vi.fn(), error: vi.fn(), success: vi.fn() }
  const options = {
    pkg: {},
    nameLabel: undefined,
    logger,
    attw: {
      level: 'error',
      ...attwOptions,
      module: {
        createPackageFromTarballData: () => ({}),
        checkPackage: () => Promise.resolve(checkResult),
      },
    },
  } as unknown as ResolvedConfig
  await attw(options, Buffer.from('') as Buffer<ArrayBuffer>)
  return logger
}

const internalResolutionError: Problem = {
  kind: 'InternalResolutionError',
  resolutionOption: 'node10',
  fileName: '/node_modules/pkg/client.d.ts',
  pos: 0,
  end: 0,
  moduleSpecifier: 'pkg',
  resolutionMode: undefined,
  trace: [],
}

const cjsResolvesToEsm: Problem = {
  kind: 'CJSResolvesToESM',
  entrypoint: '.',
  resolutionKind: 'node16-cjs',
}

describe('attw profile', () => {
  test('ignores file-based problems only visible from ignored resolutions', async () => {
    const checkResult = createCheckResult([
      [internalResolutionError, ['node10']],
      [cjsResolvesToEsm, ['node16-cjs']],
    ])

    const logger = await runAttw(checkResult, { profile: 'esm-only' })
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.success).toHaveBeenCalled()
  })

  test('keeps file-based problems visible from required resolutions', async () => {
    const checkResult = createCheckResult([
      [internalResolutionError, ['node10', 'bundler']],
    ])

    const logger = await runAttw(checkResult, { profile: 'esm-only' })
    expect(logger.error).toHaveBeenCalledOnce()
    expect(logger.error.mock.calls[0].join(' ')).toContain(
      'Internal resolution error',
    )
  })

  test('strict reports every problem', async () => {
    const checkResult = createCheckResult([
      [internalResolutionError, ['node10']],
      [cjsResolvesToEsm, ['node16-cjs']],
    ])

    const logger = await runAttw(checkResult, { profile: 'strict' })
    const message = logger.error.mock.calls[0].join(' ')
    expect(message).toContain('Internal resolution error')
    expect(message).toContain('CJS resolves to ESM')
  })

  test('node16 only ignores node10', async () => {
    const checkResult = createCheckResult([
      [internalResolutionError, ['node10']],
      [cjsResolvesToEsm, ['node16-cjs']],
    ])

    const logger = await runAttw(checkResult, { profile: 'node16' })
    const message = logger.error.mock.calls[0].join(' ')
    expect(message).not.toContain('Internal resolution error')
    expect(message).toContain('CJS resolves to ESM')
  })

  test('ignoreRules still applies', async () => {
    const checkResult = createCheckResult([[cjsResolvesToEsm, ['node16-cjs']]])

    const logger = await runAttw(checkResult, {
      profile: 'strict',
      ignoreRules: ['cjs-resolves-to-esm'],
    })
    expect(logger.error).not.toHaveBeenCalled()
  })
})
