import { getPackageType, type PackageType } from '../utils/package'
import type { NormalizedFormat, ResolvedOptions } from '../options'
import type { InputOptions, PreRenderedChunk } from 'rolldown'

export interface OutExtensionContext {
  options: InputOptions
  format: NormalizedFormat
  /** "type" field in project's package.json */
  pkgType?: PackageType
}
export interface OutExtensionObject {
  js?: string
  dts?: string
}
export type OutExtensionFactory = (
  context: OutExtensionContext,
) => OutExtensionObject | undefined

function resolveJsOutputExtension(
  packageType: PackageType,
  format: NormalizedFormat,
  fixedExtension?: boolean,
): 'cjs' | 'js' | 'mjs' {
  switch (format) {
    case 'es':
      return !fixedExtension && packageType === 'module' ? 'js' : 'mjs'
    case 'cjs':
      return fixedExtension || packageType === 'module' ? 'cjs' : 'js'
    default:
      return 'js'
  }
}

export function resolveChunkFilename(
  { outExtensions, fixedExtension, pkg, hash }: ResolvedOptions,
  inputOptions: InputOptions,
  format: NormalizedFormat,
): [entry: ChunkFileName, chunk: ChunkFileName] {
  const packageType = getPackageType(pkg)

  let jsExtension: string | undefined
  let dtsExtension: string | undefined

  if (outExtensions) {
    const { js, dts } =
      outExtensions({
        options: inputOptions,
        format,
        pkgType: packageType,
      }) || {}
    jsExtension = js
    dtsExtension = dts
  }

  jsExtension ||= `.${resolveJsOutputExtension(packageType, format, fixedExtension)}`

  const suffix = format === 'iife' || format === 'umd' ? `.${format}` : ''
  return [
    createChunkFilename(`[name]${suffix}`, jsExtension, dtsExtension),
    createChunkFilename(
      `[name]${suffix}${hash ? '-[hash]' : ''}`,
      jsExtension,
      dtsExtension,
    ),
  ]
}

type ChunkFileName = string | ((chunk: PreRenderedChunk) => string)
function createChunkFilename(
  basename: string,
  jsExtension: string,
  dtsExtension?: string,
): ChunkFileName {
  if (!dtsExtension) return `${basename}${jsExtension}`
  return (chunk: PreRenderedChunk) => {
    return `${basename}${chunk.name.endsWith('.d') ? dtsExtension : jsExtension}`
  }
}
