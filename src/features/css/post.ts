import { removePureCssChunks } from './pure-chunk.ts'
import { defaultCssBundleName } from './index.ts'
import type { Plugin } from 'rolldown'

export type CssStyles = Map<string, string>

export function createCssPostHooks(
  config: {
    css: { splitting: boolean; fileName: string }
  },
  styles: CssStyles,
): Pick<Required<Plugin>, 'renderChunk' | 'generateBundle'> {
  const collectedCSS: string[] = []

  return {
    renderChunk(_code, chunk) {
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

      if (config.css.splitting) {
        const cssAssetFileName = chunk.fileName.replace(/\.(m?js|cjs)$/, '.css')
        this.emitFile({
          type: 'asset',
          fileName: cssAssetFileName,
          source: chunkCSS,
        })
      } else {
        collectedCSS.push(chunkCSS)
      }
    },

    generateBundle(_outputOptions, bundle) {
      if (!config.css.splitting && collectedCSS.length > 0) {
        const allCSS = collectedCSS.join('')
        if (allCSS) {
          this.emitFile({
            type: 'asset',
            fileName: config.css.fileName,
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
