import { existsSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { Lang, parse, type Edit, type SgNode } from '@ast-grep/napi'
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

// Property rename mappings: oldName -> newName
const PROPERTY_RENAMES: Record<string, string> = {
  entryPoints: 'entry',
  esbuildPlugins: 'plugins',
  publicDir: 'copy',
  cjsInterop: 'cjsDefault',
}

// Properties to move under `deps` namespace: oldName -> newNameUnderDeps
const DEPS_NAMESPACE_RENAMES: Record<string, string> = {
  external: 'neverBundle',
  noExternal: 'alwaysBundle',
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
  const edits: Edit[] = []

  // Determine language based on file extension
  const lang = filename.endsWith('.tsx')
    ? Lang.Tsx
    : RE_TS.test(filename)
      ? Lang.TypeScript
      : Lang.JavaScript
  let ast = parse(lang, code)
  let root = ast.root()

  // Helper: Find property pair by name using relational rule
  const findPropertyPair = (propName: string): SgNode | null => {
    return root.find({
      rule: {
        kind: 'pair',
        has: {
          field: 'key',
          kind: 'property_identifier',
          regex: `^${propName}$`,
        },
      },
    })
  }

  // 1. Collect warnings for unsupported options
  for (const [optionName, message] of Object.entries(WARNING_MESSAGES)) {
    if (findPropertyPair(optionName)) {
      warnings.push(message)
    }
  }

  // 2. Transform unplugin-*/esbuild imports to unplugin-*/rolldown
  // Using relational rule: find string nodes inside import statements
  const importStrings = root.findAll({
    rule: {
      kind: 'string',
      inside: {
        kind: 'import_statement',
      },
      has: {
        kind: 'string_fragment',
        regex: 'unplugin-.*/esbuild',
      },
    },
  })
  for (const node of importStrings) {
    const text = node.text()
    edits.push(node.replace(text.replace('/esbuild', '/rolldown')))
  }

  // Helper: Find property identifier (key only) by name using relational rule
  const findPropertyIdentifier = (propName: string): SgNode | null => {
    return root.find({
      rule: {
        kind: 'property_identifier',
        regex: `^${propName}$`,
        inside: {
          kind: 'pair',
          field: 'key',
        },
      },
    })
  }

  // 3. Rename properties using AST - only replace the key identifier
  for (const [oldName, newName] of Object.entries(PROPERTY_RENAMES)) {
    const propIdentifier = findPropertyIdentifier(oldName)
    if (propIdentifier) {
      edits.push(propIdentifier.replace(newName))
    }
  }

  // 4. Transform bundle: true -> remove the entire pair
  const bundleTruePairs = root.findAll({
    rule: {
      kind: 'pair',
      all: [
        {
          has: {
            field: 'key',
            kind: 'property_identifier',
            regex: '^bundle$',
          },
        },
        {
          has: {
            field: 'value',
            kind: 'true',
          },
        },
      ],
    },
  })
  for (const node of bundleTruePairs) {
    edits.push(node.replace(''))
  }

  // 5. Transform bundle: false -> unbundle: true
  const bundleFalsePairs = root.findAll({
    rule: {
      kind: 'pair',
      all: [
        {
          has: {
            field: 'key',
            kind: 'property_identifier',
            regex: '^bundle$',
          },
        },
        {
          has: {
            field: 'value',
            kind: 'false',
          },
        },
      ],
    },
  })
  for (const node of bundleFalsePairs) {
    edits.push(node.replace('unbundle: true'))
  }

  // 6. Transform removeNodeProtocol: true -> nodeProtocol: 'strip'
  const removeNodeProtocolPairs = root.findAll({
    rule: {
      kind: 'pair',
      all: [
        {
          has: {
            field: 'key',
            kind: 'property_identifier',
            regex: '^removeNodeProtocol$',
          },
        },
        {
          has: {
            field: 'value',
            kind: 'true',
          },
        },
      ],
    },
  })
  for (const node of removeNodeProtocolPairs) {
    edits.push(node.replace("nodeProtocol: 'strip'"))
  }

  // 7. Move properties into deps namespace
  const depsProperties: { name: string; value: string }[] = []
  for (const [oldName, newName] of Object.entries(DEPS_NAMESPACE_RENAMES)) {
    const pair = findPropertyPair(oldName)
    if (pair) {
      const valueNode = pair.field('value')
      if (valueNode) {
        depsProperties.push({ name: newName, value: valueNode.text() })
      }
      edits.push(pair.replace(''))
    }
  }

  // 8. Transform tsup/TSUP identifiers
  const tsupIdentifiers = root.findAll({
    rule: {
      kind: 'identifier',
      regex: '^tsup$',
    },
  })
  for (const node of tsupIdentifiers) {
    edits.push(node.replace('tsdown'))
  }

  const tsupUpperIdentifiers = root.findAll({
    rule: {
      kind: 'identifier',
      regex: '^TSUP$',
    },
  })
  for (const node of tsupUpperIdentifiers) {
    edits.push(node.replace('TSDOWN'))
  }

  // 8. Transform 'tsup' string literals in imports
  const tsupImportStrings = root.findAll({
    rule: {
      kind: 'string',
      inside: {
        kind: 'import_statement',
      },
      has: {
        kind: 'string_fragment',
        regex: 'tsup',
      },
    },
  })
  for (const node of tsupImportStrings) {
    const text = node.text()
    edits.push(node.replace(text.replace('tsup', 'tsdown')))
  }

  // Apply all AST-based edits
  code = root.commitEdits(edits)

  // Phase 2: Re-parse and check for default values
  ast = parse(lang, code)
  root = ast.root()

  // Helper using relational rule for checking options
  const hasOption = (optionName: string): boolean => {
    return (
      root.find({
        rule: {
          kind: 'pair',
          has: {
            field: 'key',
            kind: 'property_identifier',
            regex: `^${optionName}$`,
          },
        },
      }) !== null
    )
  }

  // Find the config object - either direct object or wrapped in defineConfig()
  const exportDefaultDirect = root.find('export default { $$$OPTS }')
  const exportDefaultDefineConfig = root.find(
    'export default defineConfig({ $$$OPTS })',
  )

  // Determine which config object to use
  let configObjectNode: SgNode | null = null
  if (exportDefaultDirect) {
    configObjectNode = exportDefaultDirect.find({
      rule: {
        kind: 'object',
        inside: {
          kind: 'export_statement',
        },
      },
    })
  } else if (exportDefaultDefineConfig) {
    // For defineConfig, find the object inside the call expression
    configObjectNode = exportDefaultDefineConfig.find({
      rule: {
        kind: 'object',
        inside: {
          kind: 'arguments',
        },
      },
    })
  }

  const missingDefaults: string[] = []
  if (configObjectNode) {
    if (depsProperties.length > 0) {
      const depsEntries = depsProperties
        .map((p) => `${p.name}: ${p.value}`)
        .join(',\n    ')
      missingDefaults.push(`deps: {\n    ${depsEntries},\n  }`)
    }

    if (!hasOption('format')) missingDefaults.push("format: 'cjs'")
    if (!hasOption('clean')) missingDefaults.push('clean: false')
    if (!hasOption('dts')) missingDefaults.push('dts: false')
    if (!hasOption('target')) missingDefaults.push('target: false')
  }

  // Add default values using AST edit
  if (missingDefaults.length > 0 && configObjectNode) {
    const children = configObjectNode.children()
    const closeBrace = children.find((c) => c.text() === '}')
    if (closeBrace) {
      const additionsStr = missingDefaults.join(',\n  ')
      const lastChild = children.findLast((c) => c.kind() === 'pair')
      const needsComma = lastChild && !lastChild.text().endsWith(',')

      const insertText = needsComma
        ? `,\n  ${additionsStr},\n`
        : `\n  ${additionsStr},\n`

      const edit: Edit = {
        startPos: closeBrace.range().start.index,
        endPos: closeBrace.range().start.index,
        insertedText: insertText,
      }
      code = root.commitEdits([edit])
    }
  }

  // Final cleanup: remove empty lines and fix formatting
  code = code
    // Remove consecutive commas with whitespace between
    .replaceAll(/,\s*,/g, ',')
    // Remove standalone comma lines
    .replaceAll(/\n\s*,\s*\n/g, '\n')
    // Fix comma at start of line after content
    .replaceAll(/([^\s,])\n\s*,/g, '$1,')
    // Remove multiple empty lines
    .replaceAll(/\n[ \t]*\n[ \t]*\n/g, '\n\n')
    // Fix opening brace followed by comma
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
    const { code: tsupConfig, warnings } = transformTsupConfig(
      tsupConfigRaw,
      file,
    )

    // Output warnings
    for (const warning of warnings) {
      consola.warn(warning)
    }

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
