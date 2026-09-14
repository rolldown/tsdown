import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { toJsonSchema, type JsonSchema } from '@valibot/to-json-schema'
import ts from 'typescript'
import * as v from 'valibot'

export type SchemaRoot = 'type' | 'array' | 'object-or-array'

export interface GenerateSchemaOptions {
  cwd?: string
  sourcePath: string
  tsconfigPath?: string
  typeName: string
  root?: SchemaRoot
}

export interface WriteSchemaOptions extends GenerateSchemaOptions {
  outputPath: string
}

export interface CheckSchemaOptions extends GenerateSchemaOptions {
  schemaPath: string
}

export interface GeneratedValibotSchema {
  schema: v.GenericSchema
  definitions: Record<string, v.GenericSchema>
}

const builtinObjectNames = new Set([
  'AbortSignal',
  'Date',
  'Error',
  'Function',
  'Map',
  'Promise',
  'RegExp',
  'Set',
  'WeakMap',
  'WeakSet',
])

export function generateValibotSchema(
  options: GenerateSchemaOptions,
): GeneratedValibotSchema {
  const cwd = path.resolve(options.cwd ?? process.cwd())
  const tsconfigPath = path.resolve(
    cwd,
    options.tsconfigPath ?? 'tsconfig.json',
  )
  const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile)

  if (config.error) {
    throw new Error(formatDiagnostic(config.error))
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(tsconfigPath),
  )
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  const checker = program.getTypeChecker()
  const sourcePath = path.resolve(cwd, options.sourcePath)
  const sourceFile = program.getSourceFile(sourcePath)

  if (!sourceFile) {
    throw new Error(`Could not find source file: ${sourcePath}`)
  }

  const declaration = sourceFile.statements.find(
    (
      statement,
    ): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      statement.name.text === options.typeName,
  )

  if (!declaration) {
    throw new Error(`Could not find type ${options.typeName} in ${sourcePath}`)
  }

  const symbol = checker.getSymbolAtLocation(declaration.name)
  if (!symbol) {
    throw new Error(`Could not resolve type ${options.typeName}`)
  }

  const converter = new TypeConverter(checker, sourceFile)
  const typeSchema = converter.convertRoot(
    checker.getDeclaredTypeOfSymbol(symbol),
  )
  const objectSchema = addSchemaProperty(typeSchema)
  const root = options.root ?? 'type'

  let schema: v.GenericSchema
  if (root === 'type') {
    schema = objectSchema
  } else if (root === 'array') {
    schema = v.array(typeSchema)
  } else {
    schema = v.union([objectSchema, v.array(objectSchema)])
  }

  schema = v.pipe(schema, v.metadata({ title: options.typeName }))

  return {
    schema,
    definitions: converter.definitions,
  }
}

export function generateSchema(options: GenerateSchemaOptions): JsonSchema {
  const generated = generateValibotSchema(options)
  return toJsonSchema(generated.schema, {
    target: 'draft-2020-12',
    definitions: generated.definitions,
    errorMode: 'throw',
  })
}

export function writeSchema(options: WriteSchemaOptions): void {
  const { outputPath, ...generateOptions } = options
  writeFileSync(
    path.resolve(outputPath),
    `${JSON.stringify(generateSchema(generateOptions), null, 2)}\n`,
  )
}

export function checkSchema(options: CheckSchemaOptions): void {
  const { schemaPath, ...generateOptions } = options
  const expected = generateSchema(generateOptions)
  const resolvedSchemaPath = path.resolve(schemaPath)

  let actual: JsonSchema
  try {
    actual = JSON.parse(readFileSync(resolvedSchemaPath, 'utf8')) as JsonSchema
  } catch {
    throw new Error(`Schema is missing or invalid: ${resolvedSchemaPath}`)
  }

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Schema is stale: ${resolvedSchemaPath}`)
  }
}

function addSchemaProperty(schema: v.GenericSchema): v.GenericSchema {
  if (schema.type !== 'strict_object' || !('entries' in schema)) {
    return schema
  }

  const entries = schema.entries as Record<string, v.GenericSchema>
  return v.strictObject({
    ...entries,
    $schema: v.optional(v.string()),
  })
}

class TypeConverter {
  readonly definitions: Record<string, v.GenericSchema> = {}
  private readonly activeTypes = new Set<ts.Type>()
  private readonly activeDefinitions = new Set<string>()
  private readonly definitionNames = new Map<string, string>()
  private readonly usedDefinitionNames = new Map<string, string>()
  private readonly lazyDefinitions = new Map<string, v.GenericSchema>()
  private readonly checker: ts.TypeChecker
  private readonly sourceFile: ts.SourceFile

  constructor(checker: ts.TypeChecker, sourceFile: ts.SourceFile) {
    this.checker = checker
    this.sourceFile = sourceFile
  }

  convertRoot(type: ts.Type): v.GenericSchema {
    return this.convert(type, 0, true) ?? v.unknown()
  }

  private convert(
    type: ts.Type,
    depth: number,
    inline = false,
  ): v.GenericSchema | undefined {
    if (depth > 24) return v.unknown()

    if (!inline) {
      const definitionName = this.getDefinitionName(type)
      if (definitionName) {
        return this.convertDefinition(type, definitionName, depth)
      }
    }

    if (this.activeTypes.has(type)) return v.unknown()
    return this.convertInline(type, depth)
  }

  private convertInline(
    type: ts.Type,
    depth: number,
  ): v.GenericSchema | undefined {
    if (this.isModuleType(type)) return undefined

    if (type.isUnion()) {
      const members = type.types.filter(
        (member) =>
          (member.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) === 0,
      )
      const schemas = members
        .map((member) => this.convert(member, depth + 1))
        .filter((schema): schema is v.GenericSchema => schema !== undefined)
      if (schemas.length === 0) return undefined
      if (schemas.length === 1) return schemas[0]
      return v.union(
        schemas as [v.GenericSchema, v.GenericSchema, ...v.GenericSchema[]],
      )
    }

    if (type.isIntersection()) {
      const schemas = type.types
        .map((member) => this.convert(member, depth + 1))
        .filter((schema): schema is v.GenericSchema => schema !== undefined)
      if (schemas.length === 0) return undefined
      if (schemas.length === 1) return schemas[0]
      return v.intersect(
        schemas as [v.GenericSchema, v.GenericSchema, ...v.GenericSchema[]],
      )
    }

    if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      return v.unknown()
    }
    if (type.flags & ts.TypeFlags.Never) return v.never()

    if (type.flags & ts.TypeFlags.StringLiteral) {
      return v.literal((type as ts.StringLiteralType).value)
    }
    if (type.flags & ts.TypeFlags.NumberLiteral) {
      return v.literal((type as ts.NumberLiteralType).value)
    }
    if (type.flags & ts.TypeFlags.BooleanLiteral) {
      return v.literal(this.checker.typeToString(type) === 'true')
    }

    if (type.flags & ts.TypeFlags.StringLike) return v.string()
    if (type.flags & ts.TypeFlags.NumberLike) return v.number()
    if (type.flags & ts.TypeFlags.BooleanLike) return v.boolean()
    if (type.flags & ts.TypeFlags.BigIntLike) return v.number()

    if (type.flags & ts.TypeFlags.TypeParameter) {
      const constraint = this.checker.getBaseConstraintOfType(type)
      return constraint ? this.convert(constraint, depth + 1) : v.unknown()
    }

    if (!(type.flags & ts.TypeFlags.Object)) return undefined

    if (this.checker.isArrayType(type)) {
      const elementType = this.checker.getTypeArguments(
        type as ts.TypeReference,
      )[0]
      return v.array(
        elementType
          ? (this.convert(elementType, depth + 1) ?? v.unknown())
          : v.unknown(),
      )
    }

    if (this.checker.isTupleType(type)) {
      const elementTypes = this.checker
        .getTypeArguments(type as ts.TypeReference)
        .map(
          (elementType) => this.convert(elementType, depth + 1) ?? v.unknown(),
        )
      return v.tuple(elementTypes as v.TupleItems)
    }

    if (
      type.getCallSignatures().length > 0 ||
      type.getConstructSignatures().length > 0 ||
      this.isBuiltinObject(type)
    ) {
      return undefined
    }

    this.activeTypes.add(type)
    try {
      const apparent = this.checker.getApparentType(type)
      const properties = this.checker.getPropertiesOfType(apparent)
      const entries: Record<string, v.GenericSchema> = {}
      const stringIndex = this.checker.getIndexTypeOfType(
        apparent,
        ts.IndexKind.String,
      )
      let hasRequiredUnsupportedProperty = false

      for (const property of properties) {
        const declaration =
          property.valueDeclaration ?? property.declarations?.[0]
        const propertyType = this.checker.getTypeOfSymbolAtLocation(
          property,
          declaration ?? type.symbol?.declarations?.[0] ?? this.sourceFile,
        )
        const propertySchema = this.convert(propertyType, depth + 1)
        if (!propertySchema) {
          if (!(property.flags & ts.SymbolFlags.Optional)) {
            hasRequiredUnsupportedProperty = true
          }
          continue
        }

        const tags = property.getJsDocTags()
        const deprecatedTag = tags.find((tag) => tag.name === 'deprecated')
        const deprecatedText = deprecatedTag
          ? typeof deprecatedTag.text === 'string'
            ? deprecatedTag.text
            : ts.displayPartsToString(deprecatedTag.text ?? [])
          : ''
        const defaultTag = tags.find((tag) => tag.name === 'default')
        const defaultValue = defaultTag
          ? parseLiteralDefault(defaultTag.text)
          : undefined
        const description = ts.displayPartsToString(
          property.getDocumentationComment(this.checker),
        )
        const metadata: Record<string, unknown> = {}
        const fullDescription = [
          description,
          deprecatedText && `Deprecated: ${deprecatedText}`,
        ]
          .filter(Boolean)
          .join('\n\n')
        if (fullDescription) metadata.description = fullDescription
        if (deprecatedTag) metadata.deprecated = true
        if (defaultValue !== undefined) metadata.default = defaultValue

        let schema = propertySchema
        if (property.flags & ts.SymbolFlags.Optional) {
          schema = v.optional(schema)
        }
        if (Object.keys(metadata).length > 0) {
          schema = v.pipe(schema, v.metadata(metadata))
        }
        entries[property.name] = schema
      }

      if (
        hasRequiredUnsupportedProperty ||
        (properties.length > 0 &&
          Object.keys(entries).length === 0 &&
          !stringIndex)
      ) {
        return undefined
      }

      if (stringIndex) {
        return v.objectWithRest(
          entries,
          this.convert(stringIndex, depth + 1) ?? v.unknown(),
        )
      }
      return v.strictObject(entries)
    } finally {
      this.activeTypes.delete(type)
    }
  }

  private convertDefinition(
    type: ts.Type,
    name: string,
    depth: number,
  ): v.GenericSchema | undefined {
    const existing = this.definitions[name]
    if (existing) return existing

    const lazy =
      this.lazyDefinitions.get(name) ??
      v.lazy(() => this.definitions[name] ?? v.unknown())
    this.lazyDefinitions.set(name, lazy)
    if (this.activeDefinitions.has(name)) return lazy

    this.activeDefinitions.add(name)
    this.activeTypes.add(type)
    const schema = this.convertInline(type, depth + 1)
    this.activeTypes.delete(type)
    this.activeDefinitions.delete(name)
    if (!schema) {
      this.definitions[name] = v.unknown()
      return this.definitions[name]
    }
    this.definitions[name] = schema
    return schema
  }

  private getDefinitionName(type: ts.Type): string | undefined {
    if (this.isModuleType(type)) return undefined

    if (
      !(
        type.flags &
        (ts.TypeFlags.Object | ts.TypeFlags.Union | ts.TypeFlags.Intersection)
      )
    ) {
      return undefined
    }

    if (
      type.flags & ts.TypeFlags.Object &&
      (this.checker.isArrayType(type) ||
        this.checker.isTupleType(type) ||
        type.getCallSignatures().length > 0 ||
        this.isBuiltinObject(type))
    ) {
      return undefined
    }

    const symbol = type.aliasSymbol ?? type.getSymbol()
    const baseName = symbol?.getName()
    if (!baseName || baseName.startsWith('__')) return undefined

    const key = this.checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation,
    )
    const existingName = this.definitionNames.get(key)
    if (existingName) return existingName

    const usedKey = this.usedDefinitionNames.get(baseName)
    const name =
      usedKey && usedKey !== key ? `${baseName}_${hashString(key)}` : baseName
    this.definitionNames.set(key, name)
    this.usedDefinitionNames.set(name, key)
    return name
  }

  private isBuiltinObject(type: ts.Type): boolean {
    return builtinObjectNames.has(type.getSymbol()?.getName() ?? '')
  }

  private isModuleType(type: ts.Type): boolean {
    const symbol = type.getSymbol()
    return symbol ? Boolean(symbol.flags & ts.SymbolFlags.ValueModule) : false
  }
}

function parseLiteralDefault(
  text: string | ts.SymbolDisplayPart[] | undefined,
): unknown {
  const source =
    typeof text === 'string' ? text : ts.displayPartsToString(text ?? [])
  if (!source.trim()) return undefined

  const file = ts.createSourceFile(
    '__default.ts',
    `(${source})`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const statement = file.statements[0]
  if (!statement || !ts.isExpressionStatement(statement)) return undefined
  return parseLiteralExpression(statement.expression)
}

function parseLiteralExpression(expression: ts.Expression): unknown {
  if (ts.isParenthesizedExpression(expression)) {
    return parseLiteralExpression(expression.expression)
  }
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isNumericLiteral(expression)) {
    const value = Number(expression.text)
    return Number.isFinite(value) ? value : undefined
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    if (
      expression.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(expression.operand)
    ) {
      const value = Number(expression.operand.text)
      return Number.isFinite(value) ? -value : undefined
    }
    return undefined
  }
  if (ts.isArrayLiteralExpression(expression)) {
    const values: unknown[] = []
    for (const element of expression.elements) {
      if (!ts.isExpression(element)) return undefined
      const value = parseLiteralExpression(element)
      if (value === undefined) return undefined
      values.push(value)
    }
    return values
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const value: Record<string, unknown> = {}
    for (const property of expression.properties) {
      if (!ts.isPropertyAssignment(property)) return undefined
      const name = getLiteralPropertyName(property.name)
      if (name === undefined) return undefined
      const propertyValue = parseLiteralExpression(property.initializer)
      if (propertyValue === undefined) return undefined
      value[name] = propertyValue
    }
    return value
  }
  return undefined
}

function getLiteralPropertyName(name: ts.PropertyName): string | undefined {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text
  }
  return undefined
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.codePointAt(index) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
}
