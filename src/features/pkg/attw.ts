import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { dim } from 'ansis'
import { createDebug } from 'obug'
import { exec } from 'tinyexec'
import { fsRemove } from '../../utils/fs.ts'
import { importWithError } from '../../utils/general.ts'
import type { ResolvedConfig } from '../../config/index.ts'
import type {
  CheckPackageOptions,
  CheckResult,
  Problem,
} from '@arethetypeswrong/core'

const debug = createDebug('tsdown:attw')
const label = dim`[attw]`

export interface AttwOptions extends CheckPackageOptions {
  /**
   * Profiles select a set of resolution modes to require/ignore. All are evaluated but failures outside
   * of those required are ignored.
   *
   * The available profiles are:
   * - `strict`: requires all resolutions
   * - `node16`: ignores node10 resolution failures
   * - `esm-only`: ignores CJS resolution failures
   *
   * @default 'strict'
   */
  profile?: 'strict' | 'node16' | 'esm-only'
  /**
   * The level of the check.
   *
   * The available levels are:
   * - `error`: fails the build
   * - `warn`: warns the build
   *
   * @default 'warn'
   */
  level?: 'error' | 'warn'
}

/**
 * ATTW profiles.
 * Defines the resolution modes to ignore for each profile.
 *
 * @see https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md#profiles
 */
const profiles: Record<Required<AttwOptions>['profile'], string[]> = {
  strict: [],
  node16: ['node10'],
  'esm-only': ['node10', 'node16-cjs'],
}

export async function attw(options: ResolvedConfig): Promise<void> {
  if (!options.attw) return
  if (!options.pkg) {
    options.logger.warn('attw is enabled but package.json is not found')
    return
  }
  const { profile = 'strict', level = 'warn', ...attwOptions } = options.attw

  const t = performance.now()
  debug('Running attw check')

  const tempDir = await mkdtemp(path.join(tmpdir(), 'tsdown-attw-'))

  const attwCore = await importWithError<
    typeof import('@arethetypeswrong/core')
  >('@arethetypeswrong/core')
  let checkResult: CheckResult

  try {
    const { stdout: tarballInfo } = await exec(
      'npm',
      ['pack', '--json', '--pack-destination', tempDir],
      { nodeOptions: { cwd: options.cwd } },
    )
    const parsed = JSON.parse(tarballInfo)
    if (!Array.isArray(parsed) || !parsed[0]?.filename) {
      throw new Error('Invalid npm pack output format')
    }
    const tarballPath = path.join(tempDir, parsed[0].filename as string)
    const tarball = await readFile(tarballPath)

    const pkg = attwCore.createPackageFromTarballData(tarball)
    checkResult = await attwCore.checkPackage(pkg, attwOptions)
  } catch (error) {
    options.logger.error('ATTW check failed:', error)
    return
  } finally {
    await fsRemove(tempDir)
  }

  let errorMessage: string | undefined
  if (checkResult.types) {
    const problems = checkResult.problems.filter((problem) => {
      // Only apply profile filter to problems that have resolutionKind
      if ('resolutionKind' in problem) {
        return !profiles[profile]?.includes(problem.resolutionKind)
      }
      // Include all other problem types
      return true
    })

    if (problems.length) {
      const problemList = problems.map(formatProblem).join('\n')
      errorMessage = `problems found:\n${problemList}`
    }
  } else {
    errorMessage = `Package has no types`
  }

  if (errorMessage) {
    options.logger[level](options.nameLabel, label, errorMessage)
  } else {
    options.logger.success(
      options.nameLabel,
      label,
      'No problems found',
      dim`(${Math.round(performance.now() - t)}ms)`,
    )
  }
}

/**
 * Format an ATTW problem for display
 */
function formatProblem(problem: Problem): string {
  const resolutionKind =
    'resolutionKind' in problem ? ` (${problem.resolutionKind})` : ''
  const entrypoint = 'entrypoint' in problem ? ` at ${problem.entrypoint}` : ''

  switch (problem.kind) {
    case 'NoResolution':
      return `  ❌ No resolution${resolutionKind}${entrypoint}`

    case 'UntypedResolution':
      return `  ⚠️  Untyped resolution${resolutionKind}${entrypoint}`

    case 'FalseESM':
      return `  🔄 False ESM: Types indicate ESM (${problem.typesModuleKind}) but implementation is CJS (${problem.implementationModuleKind})\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`

    case 'FalseCJS':
      return `  🔄 False CJS: Types indicate CJS (${problem.typesModuleKind}) but implementation is ESM (${problem.implementationModuleKind})\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`

    case 'CJSResolvesToESM':
      return `  ⚡ CJS resolves to ESM${resolutionKind}${entrypoint}`

    case 'NamedExports': {
      const missingExports =
        problem.missing?.length > 0
          ? ` Missing: ${problem.missing.join(', ')}`
          : ''
      const allMissing = problem.isMissingAllNamed
        ? ' (all named exports missing)'
        : ''
      return `  📤 Named exports problem${allMissing}${missingExports}\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`
    }

    case 'FallbackCondition':
      return `  🎯 Fallback condition used${resolutionKind}${entrypoint}`

    case 'FalseExportDefault':
      return `  🎭 False export default\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`

    case 'MissingExportEquals':
      return `  📝 Missing export equals\n     Types: ${problem.typesFileName} | Implementation: ${problem.implementationFileName}`

    case 'InternalResolutionError':
      return `  💥 Internal resolution error in ${problem.fileName} (${problem.resolutionOption})\n     Module: ${problem.moduleSpecifier} | Mode: ${problem.resolutionMode}`

    case 'UnexpectedModuleSyntax':
      return `  📋 Unexpected module syntax in ${problem.fileName}\n     Expected: ${problem.moduleKind} | Found: ${problem.syntax === 99 ? 'ESM' : 'CJS'}`

    case 'CJSOnlyExportsDefault':
      return `  🏷️  CJS only exports default in ${problem.fileName}`

    default:
      return `  ❓ Unknown problem: ${JSON.stringify(problem)}`
  }
}
