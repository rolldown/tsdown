import { existsSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import consola from 'consola'
import { createTwoFilesPatch } from 'diff'
import { outputDiff } from '../utils.ts'

export interface TransformResult {
  code: string
  warnings: string[]
}

/**
 * Transform tsup config code to tsdown config code.
 * This function applies all migration rules and returns the transformed code
 * along with any warnings for unsupported options.
 *
 * @param input - The tsup config source code
 * @returns The transformed code and warnings
 */
export function transformTsupConfig(input: string): TransformResult {
  // TODO: Implement transformation logic
  // This is a stub for TDD - tests will fail until implemented

  const warnings: string[] = []
  let code = input

  // Basic tsup -> tsdown replacement (existing logic)
  code = code
    .replaceAll(/\btsup\b/g, 'tsdown')
    .replaceAll(/\bTSUP\b/g, 'TSDOWN')

  return { code, warnings }
}

const TSUP_FILES = [
  'tsup.config.ts',
  'tsup.config.cts',
  'tsup.config.mts',
  'tsup.config.js',
  'tsup.config.cjs',
  'tsup.config.mjs',
  'tsup.config.json',
]
export async function migrateTsupConfig(dryRun?: boolean): Promise<boolean> {
  let found = false

  for (const file of TSUP_FILES) {
    if (!existsSync(file)) continue
    consola.info(`Found \`${file}\``)
    found = true

    const tsupConfigRaw = await readFile(file, 'utf8')
    const tsupConfig = tsupConfigRaw
      .replaceAll(/\btsup\b/g, 'tsdown')
      .replaceAll(/\bTSUP\b/g, 'TSDOWN')

    const renamed = file.replaceAll('tsup', 'tsdown')
    if (dryRun) {
      consola.info(`[dry-run] ${file} -> ${renamed}:`)
      const diff = createTwoFilesPatch(file, renamed, tsupConfigRaw, tsupConfig)
      outputDiff(diff)
    } else {
      await writeFile(renamed, tsupConfig, 'utf8')
      await unlink(file)
      consola.success(`Migrated \`${file}\` to \`${renamed}\``)
    }
  }

  if (!found) {
    consola.warn('No tsup config found')
  }

  return found
}
