import { existsSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { Lang, parse } from '@ast-grep/napi'
import consola from 'consola'
import { createTwoFilesPatch } from 'diff'
import { outputDiff } from '../utils.ts'

export interface TransformResult {
  code: string
  warnings: string[]
}

const RE_TS = /\.[cm]?ts$/

// Warning messages for unsupported options
const WARNING_MESSAGES: Record<string, string> = {
  plugins:
    'The `plugins` option in tsup is experimental. Please migrate your plugins manually.',
  splitting:
    'The `splitting` option is currently unsupported in tsdown. Code splitting is always enabled and cannot be disabled.',
  metafile:
    'The `metafile` option is not available in tsdown. Consider using Vite DevTools as an alternative.',
  injectStyle:
    'The `injectStyle` option has not yet been implemented in tsdown.',
  swc: 'The `swc` option is not supported in tsdown. Please use oxc instead.',
  experimentalDts:
    'The `experimentalDts` option is not supported in tsdown. Use the `dts` option instead.',
  legacyOutput: 'The `legacyOutput` option is not supported in tsdown.',
}

/**
 * Transform tsup config code to tsdown config code.
 * This function applies all migration rules and returns the transformed code
 * along with any warnings for unsupported options.
 */
export function transformTsupConfig(
  code: string,
  filename: string,
): TransformResult {
  const warnings: string[] = []

  // Phase 1: Parse original input and collect information using AST
  const lang = filename.endsWith('.tsx')
    ? Lang.Tsx
    : RE_TS.test(filename)
      ? Lang.TypeScript
      : Lang.JavaScript
  const ast = parse(lang, code)
  const root = ast.root()

  // Helper to check if a property exists using AST
  const hasOption = (optionName: string): boolean => {
    const found = root.find({
      rule: {
        kind: 'pair',
        has: {
          kind: 'property_identifier',
          regex: `^${optionName}$`,
        },
      },
    })
    return found !== null
  }

  // Collect warnings for unsupported options (based on original AST)
  for (const [optionName, message] of Object.entries(WARNING_MESSAGES)) {
    if (hasOption(optionName)) {
      warnings.push(message)
    }
  }

  // Check which default values need to be added (based on original AST)
  const hasExportDefault = root.find('export default { $$$OPTS }') !== null
  const missingDefaults: string[] = []
  if (hasExportDefault) {
    if (!hasOption('format')) missingDefaults.push("format: 'cjs'")
    if (!hasOption('clean')) missingDefaults.push('clean: false')
    if (!hasOption('dts')) missingDefaults.push('dts: false')
    if (!hasOption('target')) missingDefaults.push('target: false')
  }

  // Phase 2: Apply all transformations using regex
  // - Transform unplugin-*/esbuild to unplugin-*/rolldown
  code = code.replaceAll(
    /(['"])unplugin-([^'"/]+)\/esbuild\1/g,
    '$1unplugin-$2/rolldown$1',
  )

  // - Transform entryPoints to entry
  code = code.replaceAll(/\bentryPoints\s*:/g, 'entry:')

  // - Transform esbuildPlugins to plugins
  code = code.replaceAll(/\besbuildPlugins\s*:/g, 'plugins:')

  // - Remove bundle: true (it's the default in tsdown)
  code = code.replaceAll(/\bbundle\s*:\s*true\s*,?\s*/g, '')

  // - Transform bundle: false to unbundle: true
  code = code.replaceAll(/\bbundle\s*:\s*false/g, 'unbundle: true')

  // - Transform publicDir to copy
  code = code.replaceAll(/\bpublicDir\s*:/g, 'copy:')

  // - Transform removeNodeProtocol: true to nodeProtocol: 'strip'
  code = code.replaceAll(
    /\bremoveNodeProtocol\s*:\s*true/g,
    "nodeProtocol: 'strip'",
  )

  // - Transform cjsInterop to cjsDefault
  code = code.replaceAll(/\bcjsInterop\s*:/g, 'cjsDefault:')

  // - Basic tsup -> tsdown replacement
  code = code
    .replaceAll(/\btsup\b/g, 'tsdown')
    .replaceAll(/\bTSUP\b/g, 'TSDOWN')

  // Phase 3: Add default values if needed
  if (missingDefaults.length > 0) {
    const exportMatch = code.match(/export\s+default\s*\{([\s\S]*?)\}/)
    if (exportMatch) {
      const existingContent = exportMatch[1].trim()
      const needsComma = existingContent && !existingContent.endsWith(',')
      const additionsStr = missingDefaults.join(',\n  ')

      if (needsComma) {
        code = code.replace(
          /export\s+default\s*\{([\s\S]*?)\}/,
          `export default {$1,\n  ${additionsStr},\n}`,
        )
      } else {
        code = code.replace(
          /export\s+default\s*\{([\s\S]*?)\}/,
          `export default {$1\n  ${additionsStr},\n}`,
        )
      }
    }
  }

  // Phase 4: Final cleanup
  code = code
    .replaceAll(/,[ \t]*,/g, ',')
    .replaceAll(/\n[ \t]*\n[ \t]*\n/g, '\n\n')
    .replaceAll(/\{[ \t]*\n[ \t]*,/g, '{\n')

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
