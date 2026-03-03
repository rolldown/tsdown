import { readFile } from 'node:fs/promises'
import { transformWithLightningCSS } from './lightningcss.ts'
import {
  compilePreprocessor,
  getPreprocessorLang,
  isCssOrPreprocessor,
} from './preprocessors.ts'
import { defaultCssBundleName } from './index.ts'
import type { ResolvedConfig } from '../../config/index.ts'
import type { Plugin } from 'rolldown'

export function CssPlugin(config: ResolvedConfig): Plugin {
  const styles = new Map<string, string>()
  const collectedCSS: string[] = []
  const { splitting, fileName: mergedCssFileName } = config.css

  return {
    name: 'tsdown:css',

    buildStart() {
      styles.clear()
      collectedCSS.length = 0
    },

    async load(id) {
      if (!isCssOrPreprocessor(id)) return

      let code = await readFile(id, 'utf8')

      const lang = getPreprocessorLang(id)
      if (lang) {
        const result = await compilePreprocessor(
          lang,
          code,
          id,
          config.css.preprocessorOptions,
        )
        code = result.code
        for (const dep of result.deps) {
          this.addWatchFile(dep)
        }
      }

      if (config.target || config.css.lightningcss) {
        code = await transformWithLightningCSS(
          code,
          id,
          config.target,
          config.css.lightningcss,
        )
      }

      if (code.length > 0 && !code.endsWith('\n')) {
        code += '\n'
      }
      styles.set(id, code)
      return { code: '', moduleSideEffects: 'no-treeshake', moduleType: 'js' }
    },

    renderChunk(_code, chunk) {
      let chunkCSS = ''
      for (const id of Object.keys(chunk.modules)) {
        if (styles.has(id)) {
          chunkCSS += styles.get(id)
        }
      }
      if (!chunkCSS) return

      if (splitting) {
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

    generateBundle() {
      if (splitting) return

      const allCSS = collectedCSS.join('')

      if (allCSS) {
        this.emitFile({
          type: 'asset',
          fileName: mergedCssFileName,
          source: allCSS,
          originalFileName: defaultCssBundleName,
        })
      }
    },
  }
}
