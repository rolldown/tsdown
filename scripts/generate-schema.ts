#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import {
  checkSchema,
  writeSchema,
  type SchemaRoot,
} from './schema-generator/index.ts'

const args = process.argv.slice(2)
const cwd = getArgument('--cwd') ?? process.cwd()
const sourcePath = getArgument('--source') ?? 'src/config/types.ts'
const typeName = getArgument('--type') ?? 'UserConfig'
const outputPath = getArgument('--out') ?? path.resolve(cwd, 'schema.json')
const tsconfigPath = getArgument('--tsconfig')
const rootValue = getArgument('--root') ?? 'object-or-array'

if (!['type', 'array', 'object-or-array'].includes(rootValue)) {
  throw new Error(`Invalid --root value: ${rootValue}`)
}

const root = rootValue as SchemaRoot
const check = args.includes('--check')

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
  writeSchema({
    cwd,
    sourcePath,
    typeName,
    outputPath,
    tsconfigPath,
    root,
  })
}

function getArgument(name: string): string | undefined {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
