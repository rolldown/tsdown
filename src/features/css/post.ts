import { removePureCssChunks } from './pure-chunk.ts'
import { defaultCssBundleName, type ResolvedCssOptions } from './index.ts'
import type { Plugin } from 'rolldown'

export type CssStyles = Map<string, string>

export function CssPostPlugin(
  config: Pick<ResolvedCssOptions, 'splitting' | 'fileName'>,
  styles: CssStyles,
): Plugin {
  const collectedCSS: string[] = []

  return {
    name: 'tsdown:css-post',

    renderChunk(_code, chunk) {
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

      collectedCSS.push(chunkCSS)
    },

    generateBundle(_outputOptions, bundle) {
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

          const cssAssetFileName = chunk.fileName.replace(/\.[cm]?js$/, '.css')
          this.emitFile({
            type: 'asset',
            fileName: cssAssetFileName,
            source: chunkCSS,
          })
        }
      } else if (collectedCSS.length > 0) {
        const allCSS = collectedCSS.join('')
        if (allCSS) {
          this.emitFile({
            type: 'asset',
            fileName: config.fileName,
            source: allCSS,
            originalFileName: defaultCssBundleName,
          })
        }
        collectedCSS.length = 0
      }

      removePureCssChunks(bundle, styles)
    },
  }
}
