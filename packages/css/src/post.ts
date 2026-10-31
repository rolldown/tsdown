import { transformWithLightningCSS } from './lightningcss.ts'
import { deduplicateCssModuleRules } from './modules.ts'
import { defaultCssBundleName, type ResolvedCssOptions } from './options.ts'
import { removePureCssChunks } from './pure-chunk.ts'
import { toCssFileName } from './utils.ts'
import type { Plugin } from 'rolldown'

export type CssStyles = Map<string, string>

export function CssPostPlugin(
  config: Pick<
    ResolvedCssOptions,
    'splitting' | 'fileName' | 'minify' | 'target' | 'lightningcss'
  >,
  styles: CssStyles,
  composedModules: ReadonlySet<string>,
): Plugin {
  const collectedCSS: string[] = []
  const collectedModuleIds: string[] = []

  async function finalizeCss(
    css: string,
    moduleIds: string[],
  ): Promise<string> {
    const hasComposedModules = moduleIds.some((id) => composedModules.has(id))
    if (!config.minify && !hasComposedModules) {
      return css
    }

    let lightningcss = config.lightningcss
    if (hasComposedModules) {
      const { composeVisitors } = await import('lightningcss')
      lightningcss = {
        ...lightningcss,
        // Only minification previously ran user visitors on the final asset.
        visitor: composeVisitors([
          config.minify ? (lightningcss?.visitor ?? {}) : {},
          { StyleSheetExit: deduplicateCssModuleRules },
        ]),
      }
    }
    const result = await transformWithLightningCSS(css, defaultCssBundleName, {
      target: config.target,
      lightningcss,
      minify: config.minify,
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
          collectedModuleIds.push(id)
        }
      }
      if (!chunkCSS) return

      if (chunkCSS.length > 0 && !chunkCSS.endsWith('\n')) {
        chunkCSS += '\n'
      }

      collectedCSS.push(chunkCSS)
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

          chunkCSS = await finalizeCss(chunkCSS, chunk.moduleIds)

          const cssAssetFileName = toCssFileName(chunk.fileName)
          this.emitFile({
            type: 'asset',
            fileName: cssAssetFileName,
            source: chunkCSS,
          })
        }
      } else if (collectedCSS.length > 0) {
        let allCSS = collectedCSS.join('')
        if (allCSS) {
          allCSS = await finalizeCss(allCSS, collectedModuleIds)
          this.emitFile({
            type: 'asset',
            fileName: config.fileName,
            source: allCSS,
            originalFileName: defaultCssBundleName,
          })
        }
        collectedCSS.length = 0
        collectedModuleIds.length = 0
      }

      removePureCssChunks(bundle, styles)
    },
  }
}
