import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { RE_CSS, RE_DTS } from 'rolldown-plugin-dts/filename'
import { detectIndentation } from '../../utils/format.ts'
import { stripExtname } from '../../utils/fs.ts'
import { matchPattern, slash, typeAssert } from '../../utils/general.ts'
import type {
  CssOptions,
  NormalizedFormat,
  ResolvedConfig,
} from '../../config/types.ts'
import type {
  ChunksByFormat,
  RolldownChunk,
  RolldownCodeChunk,
} from '../../utils/chunks.ts'
import type { Awaitable } from '../../utils/types.ts'
import type { PackageJson } from 'pkg-types'

export interface ExportsOptions {
  /**
   * Generate exports that link to source code during development.
   * - string: add as a custom condition.
   * - true: all conditions point to source files, and add dist exports to `publishConfig`.
   */
  devExports?: boolean | string

  /**
   * Exports for package.json file.
   * @default true
   */
  packageJson?: boolean

  /**
   * Exports for all files.
   */
  all?: boolean

  /**
   * Define globs or RegExp patterns to exclude files from exports.
   * This is useful for excluding files that should not be part of the package exports,
   * such as bin files or internal utilities.
   *
   * @example
   * ```js
   * exclude: ['**\/*.test.ts', '**\/*.spec.ts', /internal/]
   * ```
   */
  exclude?: (RegExp | string)[]

  /**
   * Generate legacy fields (`main` and `module`) for older Node.js and bundlers
   * that do not support package `exports` field.
   *
   * Defaults to false, if only ESM builds are included, true otherwise.
   *
   * @see {@link https://github.com/publint/publint/issues/24}
   */
  legacy?: boolean

  customExports?: (
    exports: Record<string, any>,
    context: {
      pkg: PackageJson
      chunks: ChunksByFormat
      isPublish: boolean
    },
  ) => Awaitable<Record<string, any>>
}

export async function writeExports(
  options: ResolvedConfig,
  chunks: ChunksByFormat,
): Promise<void> {
  typeAssert(options.pkg)

  const { pkg } = options
  const { publishExports, ...generated } = await generateExports(
    pkg,
    chunks,
    options,
  )

  const updatedPkg = {
    ...pkg,
    ...generated,
    packageJsonPath: undefined,
  }

  if (publishExports) {
    updatedPkg.publishConfig ||= {}
    updatedPkg.publishConfig.exports = publishExports
  }

  const original = readFileSync(pkg.packageJsonPath, 'utf8')
  let contents = JSON.stringify(updatedPkg, null, detectIndentation(original))
  if (original.endsWith('\n')) contents += '\n'
  if (contents !== original) {
    writeFileSync(pkg.packageJsonPath, contents, 'utf8')
  }
}

type SubExport = Partial<Record<'cjs' | 'es' | 'src', string>>

function shouldExclude(
  fileName: string,
  exclude?: (RegExp | string)[],
): boolean {
  if (!exclude?.length) return false
  return matchPattern(fileName, exclude)
}

export async function generateExports(
  pkg: PackageJson,
  chunks: ChunksByFormat,
  options: Pick<ResolvedConfig, 'exports' | 'css' | 'logger'>,
): Promise<{
  main: string | undefined
  module: string | undefined
  types: string | undefined
  exports: Record<string, any>
  publishExports?: Record<string, any>
}> {
  typeAssert(options.exports)
  let {
    exports: {
      devExports,
      all,
      packageJson = true,
      exclude,
      customExports,
      legacy,
    },
    css,
    logger,
  } = options

  const pkgRoot = path.dirname(pkg.packageJsonPath)

  let main: string | undefined,
    module: string | undefined,
    cjsTypes: string | undefined,
    esmTypes: string | undefined
  const exportsMap: Map<string, SubExport> = new Map()

  const formats = Object.keys(chunks)
  if (!formats.includes('cjs') && !formats.includes('es')) {
    logger.warn(`No CJS or ESM formats found in chunks for package ${pkg.name}`)
  }

  const isPureESM = formats.length === 1 && formats[0] === 'es'
  legacy ??= !isPureESM

  for (const [format, chunksByFormat] of Object.entries(chunks) as [
    NormalizedFormat,
    RolldownChunk[],
  ][]) {
    if (format !== 'es' && format !== 'cjs') continue

    // Filter out non-entry chunks and excluded files
    const filteredChunks = chunksByFormat.filter(
      (chunk): chunk is RolldownCodeChunk =>
        chunk.type === 'chunk' &&
        chunk.isEntry &&
        !shouldExclude(chunk.fileName, exclude),
    )

    const onlyOneEntry =
      filteredChunks.filter((chunk) => !RE_DTS.test(chunk.fileName)).length ===
      1

    for (const chunk of filteredChunks) {
      const normalizedName = slash(chunk.fileName)
      let name = stripExtname(normalizedName)

      const isDts = name.endsWith('.d')
      if (isDts) {
        name = name.slice(0, -2)
      }
      const isIndex = onlyOneEntry || name === 'index'
      const distFile = join(pkgRoot, chunk.outDir, normalizedName)

      if (isIndex) {
        name = '.'
        if (format === 'cjs') {
          if (isDts) {
            cjsTypes = distFile
          } else {
            main = distFile
          }
        } else if (format === 'es') {
          if (isDts) {
            esmTypes = distFile
          } else {
            module = distFile
          }
        }
      } else if (name.endsWith('/index')) {
        name = `./${name.slice(0, -6)}`
      } else {
        name = `./${name}`
      }

      let subExport = exportsMap.get(name)
      if (!subExport) {
        subExport = {}
        exportsMap.set(name, subExport)
      }

      if (!isDts) {
        subExport[format] = distFile
        if (chunk.facadeModuleId && !subExport.src) {
          subExport.src = `./${slash(path.relative(pkgRoot, chunk.facadeModuleId))}`
        }
      }
    }
  }

  const sortedExportsMap = Array.from(exportsMap.entries()).toSorted(
    ([a], [b]) => {
      if (a === 'index') return -1
      return a.localeCompare(b)
    },
  )

  let exports: Record<string, any> = Object.fromEntries(
    sortedExportsMap.map(([name, subExport]) => [
      name,
      genSubExport(devExports, subExport),
    ]),
  )
  exportMeta(exports, all, packageJson)
  exportCss(exports, chunks, css, pkgRoot)
  if (customExports) {
    exports = await customExports(exports, {
      pkg,
      chunks,
      isPublish: false,
    })
  }

  let publishExports: Record<string, any> | undefined
  if (devExports) {
    publishExports = Object.fromEntries(
      sortedExportsMap.map(([name, subExport]) => [
        name,
        genSubExport(false, subExport),
      ]),
    )
    exportMeta(publishExports, all, packageJson)
    exportCss(publishExports, chunks, css, pkgRoot)
    if (customExports) {
      publishExports = await customExports(publishExports, {
        pkg,
        chunks,
        isPublish: true,
      })
    }
  }

  return {
    main: legacy ? main || module || pkg.main : undefined,
    module: legacy ? module || pkg.module : undefined,
    types: cjsTypes || esmTypes || pkg.types,
    exports,
    publishExports,
  }
}

function genSubExport(
  devExports: string | boolean | undefined,
  { src, es, cjs }: SubExport,
) {
  if (devExports === true) {
    return src!
  }

  let value: any
  const dualFormat = es && cjs
  if (!dualFormat && !devExports) {
    value = cjs || es
  } else {
    value = {}
    if (typeof devExports === 'string') {
      value[devExports] = src
    }
    if (cjs) value[dualFormat ? 'require' : 'default'] = cjs
    if (es) value[dualFormat ? 'import' : 'default'] = es
  }

  return value
}

function exportMeta(
  exports: Record<string, any>,
  all?: boolean,
  packageJson?: boolean,
) {
  if (all) {
    exports['./*'] = './*'
  } else if (packageJson) {
    exports['./package.json'] = './package.json'
  }
}

function exportCss(
  exports: Record<string, any>,
  chunks: ChunksByFormat,
  { splitting }: Required<CssOptions>,
  pkgRoot: string,
) {
  if (splitting) return

  for (const chunksByFormat of Object.values(chunks)) {
    for (const chunk of chunksByFormat) {
      if (chunk.type === 'asset' && RE_CSS.test(chunk.fileName)) {
        const filename = slash(chunk.fileName)
        exports[`./${filename}`] = join(pkgRoot, chunk.outDir, filename)
        return
      }
    }
  }
}

export function hasExportsTypes(pkg?: PackageJson): boolean {
  const exports = pkg?.exports
  if (!exports) return false

  if (
    typeof exports === 'object' &&
    exports !== null &&
    !Array.isArray(exports)
  ) {
    // Check if exports.types exists
    if ('types' in exports) {
      return true
    }

    // Check if exports['.'].types exists
    if ('.' in exports) {
      const mainExport = exports['.']
      if (
        typeof mainExport === 'object' &&
        mainExport !== null &&
        'types' in mainExport
      ) {
        return true
      }
    }
  }

  return false
}

function join(pkgRoot: string, outDir: string, fileName: string) {
  const outDirRelative = slash(path.relative(pkgRoot, outDir))
  return `${outDirRelative ? `./${outDirRelative}` : '.'}/${fileName}`
}
