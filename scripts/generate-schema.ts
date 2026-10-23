#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { cac } from 'cac'
import { generateSchema } from './schema-generator/index.ts'

interface Flags {
  cwd: string
  source: string
  type: string
  out?: string
  tsconfig?: string
  check?: boolean
}

const cli = cac('generate-schema').help()
cli
  .command('')
  .option('--cwd <path>', 'Working directory', { default: process.cwd() })
  .option('--source <path>', 'TypeScript source file', {
    default: 'src/config/types.ts',
  })
  .option('--type <name>', 'Type name to generate', { default: 'UserConfig' })
  .option('--out <path>', 'Output JSON Schema path')
  .option('--tsconfig <path>', 'TypeScript config path')
  .option('-c, --check', 'Check whether the existing schema is up to date')
  .action(async ({ cwd, source, type, out, tsconfig, check }: Flags) => {
    await generateSchema({
      cwd,
      sourcePath: source,
      typeName: type,
      outputPath: path.resolve(cwd, out ?? 'schema.json'),
      tsconfigPath: tsconfig,
      check,
    })
  })

cli.parse()
