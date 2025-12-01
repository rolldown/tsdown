import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { RE_DTS } from 'rolldown-plugin-dts/filename'
import { detectIndentation } from '../utils/format.ts'
import { slash } from '../utils/general.ts'
import type { NormalizedFormat, ResolvedConfig } from '../config/index.ts'
import type { Awaitable } from '../utils/types.ts'
import type { PackageJson } from 'pkg-types'
import type { OutputAsset, OutputChunk } from 'rolldown'

export type TsdownChunks = Partial<
  Record<NormalizedFormat, Array<OutputChunk | OutputAsset>>
>

export interface ExportsOptions {
  /**
   * Generate exports that link to source code during development.
   * - string: add as a custom condition.
   * - true: all conditions point to source files, and add dist exports to `publishConfig`.
   */
  devExports?: boolean | string

  /**
   * Exports for all files.
   */
  all?: boolean

  customExports?: (
    exports: Record<string, any>,
    context: {
      pkg: PackageJson
      chunks: TsdownChunks
      outDir: string
      isPublish: boolean
    },
  ) => Awaitable<Record<string, any>>
}

export const exportsState: Map<string, Set<TsdownChunks>> = new Map()

export async function writeExports(
  options: ResolvedConfig,
  chunks: TsdownChunks,
): Promise<void> {
  if (!options.exports) return

  const { outDir, pkg } = options
  if (!pkg) {
    throw new Error('`package.json` not found, cannot write exports')
  }

  const stateKey = `${pkg.packageJsonPath as string}::${outDir}`
  let chunkSets = exportsState.get(stateKey)
  if (!chunkSets) {
    chunkSets = new Set()
    exportsState.set(stateKey, chunkSets)
  }
  chunkSets.add(chunks)
  const mergedChunks = mergeChunks(chunkSets)

  const { publishExports, ...generated } = await generateExports(
    pkg,
    outDir,
    mergedChunks,
    options.exports,
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

  const original = await readFile(pkg.packageJsonPath, 'utf8')
  let contents = JSON.stringify(updatedPkg, null, detectIndentation(original))
  if (original.endsWith('\n')) contents += '\n'
  if (contents !== original) {
    await writeFile(pkg.packageJsonPath, contents, 'utf8')
  }
}

type SubExport = Partial<Record<'cjs' | 'es' | 'src', string>>

export async function generateExports(
  pkg: PackageJson,
  outDir: string,
  chunks: TsdownChunks,
  { devExports, all, customExports }: ExportsOptions,
): Promise<{
  main: string | undefined
  module: string | undefined
  types: string | undefined
  exports: Record<string, any>
  publishExports?: Record<string, any>
}> {
  const pkgJsonPath = pkg.packageJsonPath as string
  const pkgRoot = path.dirname(pkgJsonPath)
  const outDirRelative = slash(path.relative(pkgRoot, outDir))

  let main: string | undefined,
    module: string | undefined,
    cjsTypes: string | undefined,
    esmTypes: string | undefined
  const exportsMap: Map<string, SubExport> = new Map()

  for (const [format, chunksByFormat] of Object.entries(chunks) as [
    NormalizedFormat,
    (OutputChunk | OutputAsset)[],
  ][]) {
    if (format !== 'es' && format !== 'cjs') continue

    const onlyOneEntry =
      chunksByFormat.filter(
        (chunk) =>
          chunk.type === 'chunk' &&
          chunk.isEntry &&
          !RE_DTS.test(chunk.fileName),
      ).length === 1
    for (const chunk of chunksByFormat) {
      if (chunk.type !== 'chunk' || !chunk.isEntry) continue

      const normalizedName = slash(chunk.fileName)
      const ext = path.extname(chunk.fileName)
      let name = normalizedName.slice(0, -ext.length)

      const isDts = name.endsWith('.d')
      if (isDts) {
        name = name.slice(0, -2)
      }
      const isIndex = onlyOneEntry || name === 'index'
      const distFile = `${outDirRelative ? `./${outDirRelative}` : '.'}/${normalizedName}`

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
  exportMeta(exports, all)
  if (customExports) {
    exports = await customExports(exports, {
      pkg,
      outDir,
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
    exportMeta(publishExports, all)
    if (customExports) {
      publishExports = await customExports(publishExports, {
        pkg,
        outDir,
        chunks,
        isPublish: true,
      })
    }
  }

  return {
    main: main || module || pkg.main,
    module: module || pkg.module,
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
    if (es) value[dualFormat ? 'import' : 'default'] = es
    if (cjs) value[dualFormat ? 'require' : 'default'] = cjs
  }

  return value
}

function exportMeta(exports: Record<string, any>, all?: boolean) {
  if (all) {
    exports['./*'] = './*'
  } else {
    exports['./package.json'] = './package.json'
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

function mergeChunks(chunkSets: Set<TsdownChunks>): TsdownChunks {
  const merged: TsdownChunks = {}
  for (const chunkSet of chunkSets) {
    for (const [format, chunks] of Object.entries(chunkSet) as [
      NormalizedFormat,
      (OutputChunk | OutputAsset)[],
    ][]) {
      if (!chunks.length) continue
      const target = (merged[format] ||= [])
      target.push(...chunks)
    }
  }
  return merged
}
