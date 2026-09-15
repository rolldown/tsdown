import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { generateSchema, generateValibotSchema } from './index.ts'

const projectRoot = path.resolve(import.meta.dirname, '../..')

describe('tsdown schema generator', () => {
  test('builds a Valibot schema with reusable definitions', () => {
    const generated = generateValibotSchema({
      cwd: projectRoot,
      sourcePath: 'src/config/types.ts',
      typeName: 'UserConfig',
      root: 'object-or-array',
    })

    expect(generated.schema.type).toBe('union')
    expect(generated.definitions).toHaveProperty('DepsConfig')
    expect(generated.definitions).toHaveProperty('Workspace')
  })

  test('matches the committed JSON Schema', () => {
    const generated = generateSchema({
      cwd: projectRoot,
      sourcePath: 'src/config/types.ts',
      typeName: 'UserConfig',
      root: 'object-or-array',
    })
    const committed = JSON.parse(
      readFileSync(path.join(projectRoot, 'schema.json'), 'utf8'),
    )

    expect(generated).toEqual(committed)
    expect(generated.title).toBe('UserConfig')
    const objectSchema = generated.anyOf?.find(
      (schema) =>
        typeof schema === 'object' &&
        schema !== null &&
        schema.type === 'object',
    ) as
      | {
          additionalProperties?: unknown
          properties?: Record<string, unknown>
        }
      | undefined
    expect(objectSchema?.additionalProperties).toBe(false)
    expect(objectSchema?.properties?.$schema).toEqual({ type: 'string' })

    const serialized = JSON.stringify(generated)
    expect(serialized).not.toContain('"plugins"')
    expect(
      Object.keys(generated.$defs ?? {}).some((name) =>
        name.toLowerCase().includes('plugin'),
      ),
    ).toBe(false)

    const workspace = generated.$defs?.Workspace as
      | {
          properties?: {
            include?: { anyOf?: Array<Record<string, unknown>> }
          }
        }
      | undefined
    const includeSchemas = workspace?.properties?.include?.anyOf ?? []
    expect(includeSchemas).toContainEqual({ type: 'string' })
    expect(includeSchemas.some((schema) => 'allOf' in schema)).toBe(false)
  })
})
