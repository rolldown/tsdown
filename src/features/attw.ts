import child_process from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { blue, dim } from 'ansis'
import Debug from 'debug'
import { fsRemove } from '../utils/fs'
import { logger } from '../utils/logger'
import type { AttwOptions, ResolvedOptions } from '../options'
import type { Problem } from '@arethetypeswrong/core'

const debug = Debug('tsdown:attw')
const exec = promisify(child_process.exec)

/**
 * ATTW profiles.
 * Defines the resolution modes to ignore for each profile.
 *
 * @see https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md#profiles
 */
const profiles: Record<Required<AttwOptions>['profile'], string[]> = {
  strict: [],
  node16: ['node10'],
  esmOnly: ['node10', 'node16-cjs'],
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

export async function attw(options: ResolvedOptions): Promise<void> {
  if (!options.attw) return
  if (!options.pkg) {
    logger.warn('attw is enabled but package.json is not found')
    return
  }

  const t = performance.now()
  debug('Running attw check')

  const tempDir = await mkdtemp(path.join(tmpdir(), 'tsdown-attw-'))

  let attwCore: typeof import('@arethetypeswrong/core')
  try {
    attwCore = await import('@arethetypeswrong/core')
  } catch {
    logger.error(
      `ATTW check requires ${blue`@arethetypeswrong/core`} to be installed.`,
    )
    return
  }

  try {
    const { stdout: tarballInfo } = await exec(
      `npm pack --json ----pack-destination ${tempDir}`,
      { encoding: 'utf-8', cwd: options.cwd },
    )
    const parsed = JSON.parse(tarballInfo)
    if (!Array.isArray(parsed) || !parsed[0]?.filename) {
      throw new Error('Invalid npm pack output format')
    }
    const tarballPath = path.join(tempDir, parsed[0].filename as string)
    const tarball = await readFile(tarballPath)

    const pkg = attwCore.createPackageFromTarballData(tarball)
    const attwOptions = options.attw === true ? {} : options.attw
    const checkResult = await attwCore.checkPackage(pkg, attwOptions)
    const profile = attwOptions.profile ?? 'strict'
    const level = attwOptions.level ?? 'warn'

    if (checkResult.types !== false && checkResult.problems) {
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
        const problemMessage = `Are the types wrong problems found:\n${problemList}`

        if (level === 'error') {
          throw new Error(problemMessage)
        }

        logger.warn(problemMessage)
      }
    } else {
      logger.success(
        `No Are the types wrong problems found`,
        dim`(${Math.round(performance.now() - t)}ms)`,
      )
    }
  } catch (error) {
    logger.error('ATTW check failed:', error)
    debug('Found errors, setting exit code to 1')
    process.exitCode = 1
  } finally {
    await fsRemove(tempDir)
  }
}
