import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { writeFixtures } from '../../tests/utils.ts'
import { generateJsonSchema } from './index.ts'
import type { JsonSchema } from '@valibot/to-json-schema'

const projectRoot = path.resolve(import.meta.dirname, '../..')

describe('tsdown schema generator', () => {
  test('matches the committed JSON Schema', () => {
    const generated = generateJsonSchema({
      cwd: projectRoot,
      sourcePath: 'src/config/types.ts',
      typeName: 'UserConfig',
    })
    const committed = JSON.parse(
      readFileSync(path.join(projectRoot, 'schema.json'), 'utf8'),
    )

    expect(generated).toEqual(committed)
    expect(generated.title).toBe('UserConfig')
    const [objectSchema, arraySchema] = generated.anyOf as JsonSchema[]
    expect(objectSchema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      properties: { $schema: { type: 'string' } },
    })
    expect(arraySchema).toEqual({ type: 'array', items: objectSchema })
    expect(generated.$defs).toHaveProperty('DepsConfig')
    expect(generated.$defs).toHaveProperty('Workspace')
    expect(JSON.stringify(generated)).not.toContain('"plugins"')
    expect(Object.keys(generated.$defs ?? {}).join(',')).not.toMatch(/plugin/i)
  })

  test('resolves recursive definitions and distinguishes generic arguments', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
      'index.ts': `
        interface Box<T> { value: T; next?: Box<T> }
        interface A { b?: B }
        interface B { a?: A }
        declare const anonymous: { value: string; next?: typeof anonymous }
        export interface Config {
          anonymous: typeof anonymous
          boxes: [Box<string>, Box<number>, Box<string>]
          a: A
          b: B
          choice: 'one' | 'two'
          intersection: string & {}
        }
      `,
    })
    const generated = generateJsonSchema({
      cwd: testDir,
      sourcePath: 'index.ts',
      typeName: 'Config',
    })
    const boxNames = Object.keys(generated.$defs ?? {}).filter((name) =>
      name.startsWith('Box'),
    )
    expect(boxNames).toHaveLength(2)
    const numberBox = boxNames.find((name) => name !== 'Box')!

    const objectSchema = generated.anyOf?.[0] as JsonSchema
    expect(objectSchema.properties?.anonymous).toEqual({
      type: 'object',
      properties: { value: { type: 'string' }, next: {} },
      required: ['value'],
      additionalProperties: false,
    })
    expect(objectSchema.properties).toMatchObject({
      boxes: {
        type: 'array',
        prefixItems: [
          { $ref: '#/$defs/Box' },
          { $ref: `#/$defs/${numberBox}` },
          { $ref: '#/$defs/Box' },
        ],
      },
      a: { $ref: '#/$defs/A' },
      b: { $ref: '#/$defs/B' },
      choice: { anyOf: [{ const: 'one' }, { const: 'two' }] },
      intersection: { type: 'string' },
    })
    expect(generated.$defs).toMatchObject({
      Box: {
        properties: {
          value: { type: 'string' },
          next: { $ref: '#/$defs/Box' },
        },
      },
      [numberBox]: {
        properties: {
          value: { type: 'number' },
          next: { $ref: `#/$defs/${numberBox}` },
        },
      },
      A: { properties: { b: { $ref: '#/$defs/B' } } },
      B: { properties: { a: { $ref: '#/$defs/A' } } },
    })
  })

  test('preserves literal defaults and ignores expressions that are not JSON values', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'tsconfig.json': '{}',
      'index.ts': `
        export interface Config {
          /** Description. @default { name: 'test', values: [-1, true, null] } */
          literal: unknown
          /** @default process.cwd() */
          dynamic: unknown
          /** @default [1, ...rest] */
          spread: unknown
          /** @default [, 1] */
          hole: unknown
          /** @deprecated Use literal instead. */
          old: unknown
        }
      `,
    })
    const generated = generateJsonSchema({
      cwd: testDir,
      sourcePath: 'index.ts',
      typeName: 'Config',
    })
    const objectSchema = generated.anyOf?.[0] as JsonSchema
    expect(objectSchema.properties).toEqual({
      literal: {
        description: 'Description.',
        default: { name: 'test', values: [-1, true, null] },
      },
      dynamic: {},
      spread: {},
      hole: {},
      old: {
        description: 'Deprecated: Use literal instead.',
        deprecated: true,
      },
      $schema: { type: 'string' },
    })
  })
})
