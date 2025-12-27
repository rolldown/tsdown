import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { importWithError } from '../utils/general.ts'
import { esbuildTargetToLightningCSS } from '../utils/lightningcss.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { RolldownChunk } from '../utils/chunks.ts'

export interface CssBundleResult {
  chunks: RolldownChunk[]
}

/**
 * Build CSS entries using LightningCSS transform.
 * This bypasses Rolldown to avoid generating empty JS files for CSS-only entries.
 *
 * We use `transform` instead of `bundleAsync` to avoid inlining @import statements,
 * preserving the original behavior where each CSS file is output separately.
 */
export async function buildCssEntries(
  config: ResolvedConfig,
  cssEntries: Record<string, string>,
): Promise<CssBundleResult> {
  const { outDir, minify, target, cwd } = config
  const chunks: RolldownChunk[] = []

  // Dynamic import lightningcss using importWithError for proper error handling
  const lightningcss =
    await importWithError<typeof import('lightningcss')>('lightningcss')

  // Convert esbuild target format to lightningcss targets
  const targets = target ? esbuildTargetToLightningCSS(target) : undefined

  // Ensure output directory exists
  await mkdir(outDir, { recursive: true })

  for (const [name, file] of Object.entries(cssEntries)) {
    const absolutePath = path.isAbsolute(file) ? file : path.resolve(cwd, file)

    // Read CSS file content
    const cssContent = await readFile(absolutePath)

    // Use lightningcss transform (not bundle) to process CSS
    // This preserves @import statements instead of inlining them
    const result = lightningcss.transform({
      filename: absolutePath,
      code: cssContent,
      minify: !!minify,
      targets,
    })

    const { code } = result

    // Output file name
    const outputName = `${name}.css`
    const outputPath = path.join(outDir, outputName)

    // Write to file
    await writeFile(outputPath, code)

    // Record chunk info for reporting
    chunks.push({
      type: 'asset',
      fileName: outputName,
      name,
      source: code,
    } as RolldownChunk)
  }

  return { chunks }
}
