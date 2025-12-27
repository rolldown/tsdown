import { Buffer } from 'node:buffer'
import path from 'node:path'
import { promisify } from 'node:util'
import { brotliCompress, gzip } from 'node:zlib'
import { bold, dim, green } from 'ansis'
import { createDebug } from 'obug'
import { RE_DTS } from 'rolldown-plugin-dts/filename'
import { formatBytes } from '../utils/format.ts'
import { noop } from '../utils/general.ts'
import { prettyFormat, type Logger } from '../utils/logger.ts'
import type { RolldownChunk } from '../utils/chunks.ts'
import type { OutputAsset, OutputChunk, Plugin } from 'rolldown'

const debug = createDebug('tsdown:report')
const brotliCompressAsync = promisify(brotliCompress)
const gzipAsync = promisify(gzip)

interface SizeInfo {
  filename: string
  dts: boolean
  isEntry: boolean
  raw: number
  gzip: number
  brotli: number
  rawText: string
  gzipText?: string
  brotliText?: string
}

export interface ReportOptions {
  /**
   * Enable/disable gzip-compressed size reporting.
   * Compressing large output files can be slow, so disabling this may increase build performance for large projects.
   *
   * @default true
   */
  gzip?: boolean

  /**
   * Enable/disable brotli-compressed size reporting.
   * Compressing large output files can be slow, so disabling this may increase build performance for large projects.
   *
   * @default false
   */
  brotli?: boolean

  /**
   * Skip reporting compressed size for files larger than this size.
   * @default 1_000_000 // 1MB
   */
  maxCompressSize?: number
}

const defaultOptions = {
  gzip: true,
  brotli: false,
  maxCompressSize: 1_000_000,
}

export function ReportPlugin(
  userOptions: ReportOptions,
  logger: Logger,
  cwd: string,
  cjsDts?: boolean,
  nameLabel?: string,
  isDualFormat?: boolean,
  extraChunks?: () => RolldownChunk[],
): Plugin {
  const options = {
    ...defaultOptions,
    ...userOptions,
  }

  return {
    name: 'tsdown:report',
    async writeBundle(outputOptions, bundle) {
      const outDir = path.relative(
        cwd,
        outputOptions.file
          ? path.resolve(cwd, outputOptions.file, '..')
          : path.resolve(cwd, outputOptions.dir!),
      )

      const sizes: SizeInfo[] = []

      // Add Rolldown bundle chunks
      for (const chunk of Object.values(bundle)) {
        const size = await calcSize(options, chunk)
        sizes.push(size)
      }

      // Add extra chunks (e.g., CSS chunks built separately)
      if (extraChunks) {
        for (const chunk of extraChunks()) {
          // Only add CSS chunks that are not already in the bundle
          if (chunk.type === 'asset' && /\.css$/i.test(chunk.fileName)) {
            const size = await calcSize(options, chunk)
            sizes.push(size)
          }
        }
      }

      const filenameLength = Math.max(
        ...sizes.map((size) => size.filename.length),
      )

      // padding rawText, gzipText, brotliText to the same length
      const rawTextLength = Math.max(
        ...sizes.map((size) => size.rawText.length),
      )
      const gzipTextLength = Math.max(
        ...sizes.map((size) =>
          size.gzipText == null ? 0 : size.gzipText.length,
        ),
      )
      const brotliTextLength = Math.max(
        ...sizes.map((size) =>
          size.brotliText == null ? 0 : size.brotliText.length,
        ),
      )

      let totalRaw = 0
      for (const size of sizes) {
        size.rawText = size.rawText.padStart(rawTextLength)
        size.gzipText = size.gzipText?.padStart(gzipTextLength)
        size.brotliText = size.brotliText?.padStart(brotliTextLength)
        totalRaw += size.raw
      }

      // sort
      sizes.sort((a, b) => {
        // dts last
        if (a.dts !== b.dts) return a.dts ? 1 : -1
        // entry first
        if (a.isEntry !== b.isEntry) return a.isEntry ? -1 : 1
        // otherwise, sort by raw size descending
        return b.raw - a.raw
      })

      const formatLabel =
        isDualFormat && prettyFormat(cjsDts ? 'cjs' : outputOptions.format)

      for (const size of sizes) {
        const filenameColor = size.dts ? green : noop

        logger.info(
          nameLabel,
          formatLabel,
          dim(outDir + path.sep) +
            filenameColor((size.isEntry ? bold : noop)(size.filename)),
          ` `.repeat(filenameLength - size.filename.length),
          dim(size.rawText),
          options.gzip && size.gzipText && dim`│ gzip: ${size.gzipText}`,
          options.brotli &&
            size.brotliText &&
            dim`│ brotli: ${size.brotliText}`,
        )
      }

      const totalSizeText = formatBytes(totalRaw)
      logger.info(
        nameLabel,
        formatLabel,
        `${sizes.length} files, total: ${totalSizeText}`,
      )
    },
  }
}

async function calcSize(
  options: Required<ReportOptions>,
  chunk: OutputAsset | OutputChunk,
): Promise<SizeInfo> {
  debug(`Calculating size for`, chunk.fileName)

  const content = chunk.type === 'chunk' ? chunk.code : chunk.source

  const raw = Buffer.byteLength(content, 'utf8')
  debug('[size]', chunk.fileName, raw)

  let gzip: number = Infinity
  let brotli: number = Infinity
  if (raw > options.maxCompressSize) {
    debug(chunk.fileName, 'file size exceeds limit, skip gzip/brotli')
  } else {
    if (options.gzip) {
      gzip = (await gzipAsync(content)).length
      debug('[gzip]', chunk.fileName, gzip)
    }
    if (options.brotli) {
      brotli = (await brotliCompressAsync(content)).length
      debug('[brotli]', chunk.fileName, brotli)
    }
  }

  return {
    filename: chunk.fileName,
    dts: RE_DTS.test(chunk.fileName),
    isEntry: chunk.type === 'chunk' && chunk.isEntry,
    raw,
    rawText: formatBytes(raw)!,
    gzip,
    gzipText: formatBytes(gzip),
    brotli,
    brotliText: formatBytes(brotli),
  }
}
