import { transformWithLightningCSS } from './lightningcss.ts'
import { defaultCssBundleName, type ResolvedCssOptions } from './options.ts'
import { removePureCssChunks } from './pure-chunk.ts'
import { toCssFileName } from './utils.ts'
import type { OutputAsset, OutputChunk, Plugin } from 'rolldown'

export type CssStyles = Map<string, string>

export function CssPostPlugin(
  config: Pick<
    ResolvedCssOptions,
    'splitting' | 'fileName' | 'minify' | 'target' | 'lightningcss'
  >,
  styles: CssStyles,
): Plugin {
  // Keyed by the chunk's preliminary file name: that is what `renderChunk`
  // sees as `fileName`, and what `generateBundle` exposes as
  // `preliminaryFileName`.
  const chunkCSSMap = new Map<string, string>()

  async function finalizeCss(css: string): Promise<string> {
    if (!config.minify) return css
    const result = await transformWithLightningCSS(css, defaultCssBundleName, {
      target: config.target,
      lightningcss: config.lightningcss,
      minify: true,
    })
    let code = result.code
    if (code.length && !code.endsWith('\n')) {
      code += '\n'
    }
    return code
  }

  return {
    name: 'tsdown:css-post',

    renderChunk(_code, chunk) {
      if (styles.size === 0) return
      if (config.splitting) return

      let chunkCSS = ''
      for (const id of Object.keys(chunk.modules)) {
        const code = styles.get(id)
        if (code) {
          chunkCSS += code
        }
      }
      if (!chunkCSS) return

      if (chunkCSS.length > 0 && !chunkCSS.endsWith('\n')) {
        chunkCSS += '\n'
      }

      chunkCSSMap.set(chunk.fileName, chunkCSS)
    },

    async generateBundle(_outputOptions, bundle) {
      if (config.splitting) {
        // Emit CSS assets in generateBundle where chunk fileNames are resolved
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue

          let chunkCSS = ''
          for (const id of chunk.moduleIds) {
            const code = styles.get(id)
            if (code) {
              chunkCSS += code
            }
          }
          if (!chunkCSS) continue

          if (!chunkCSS.endsWith('\n')) {
            chunkCSS += '\n'
          }

          chunkCSS = await finalizeCss(chunkCSS)

          const cssAssetFileName = toCssFileName(chunk.fileName)
          this.emitFile({
            type: 'asset',
            fileName: cssAssetFileName,
            source: chunkCSS,
          })
        }
      } else if (chunkCSSMap.size > 0) {
        // Merge in import order rather than render order, following Vite: a
        // chunk's static imports come before the chunk itself, and dynamically
        // imported chunks come last so their styles take precedence.
        let allCSS = ''
        const collected = new Set<OutputChunk>()
        const dynamicImports = new Set<string>()

        const collect = (chunk: OutputChunk | OutputAsset | undefined) => {
          if (!chunk || chunk.type !== 'chunk' || collected.has(chunk)) return
          collected.add(chunk)
          for (const imp of chunk.imports) collect(bundle[imp])
          for (const imp of chunk.dynamicImports) dynamicImports.add(imp)
          allCSS += chunkCSSMap.get(chunk.preliminaryFileName) ?? ''
        }

        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && chunk.isEntry) collect(chunk)
        }
        for (const fileName of dynamicImports) collect(bundle[fileName])

        if (allCSS) {
          allCSS = await finalizeCss(allCSS)
          this.emitFile({
            type: 'asset',
            fileName: config.fileName,
            source: allCSS,
            originalFileName: defaultCssBundleName,
          })
        }
        chunkCSSMap.clear()
      }

      removePureCssChunks(bundle, styles)
    },
  }
}
