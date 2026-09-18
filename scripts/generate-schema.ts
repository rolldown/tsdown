#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { cac } from 'cac'
import {
  checkSchema,
  writeSchema,
  type SchemaRoot,
} from './schema-generator/index.ts'

const cli = cac('generate-schema')
  .option('--cwd <path>', 'Working directory', { default: process.cwd() })
  .option('--source <path>', 'TypeScript source file', {
    default: 'src/config/types.ts',
  })
  .option('--type <name>', 'Type name to generate', { default: 'UserConfig' })
  .option('--out <path>', 'Output JSON Schema path')
  .option('--tsconfig <path>', 'TypeScript config path')
  .option('--root <kind>', 'Schema root: type, array, or object-or-array', {
    default: 'object-or-array',
  })
  .option('-c, --check', 'Check whether the existing schema is up to date')

const { options } = cli.parse()
const cwd = options.cwd as string
const sourcePath = options.source as string
const typeName = options.type as string
const outputPath = path.resolve(cwd, options.out ?? 'schema.json')
const tsconfigPath = options.tsconfig as string | undefined
const rootValue = options.root as string

if (!['type', 'array', 'object-or-array'].includes(rootValue)) {
  throw new Error(`Invalid --root value: ${rootValue}`)
}

const root = rootValue as SchemaRoot
const check = Boolean(options.check)

if (check) {
  checkSchema({
    cwd,
    sourcePath,
    typeName,
    schemaPath: outputPath,
    tsconfigPath,
    root,
  })
} else {
  await writeSchema({
    cwd,
    sourcePath,
    typeName,
    outputPath,
    tsconfigPath,
    root,
  })
}
