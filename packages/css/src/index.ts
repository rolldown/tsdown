import { readFile } from 'node:fs/promises'
import { createCssPostHooks, RE_CSS, type CssStyles } from 'tsdown/css'
import {
  bundleWithLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'
import {
  compilePreprocessor,
  getPreprocessorLang,
  isCssOrPreprocessor,
} from './preprocessors.ts'
import type { ResolvedConfig, Rolldown } from 'tsdown'

export function CssPlugin(config: ResolvedConfig): Rolldown.Plugin {
  const styles: CssStyles = new Map()
  const postHooks = createCssPostHooks(config, styles)
  const shouldMinify = config.css.minify
  const cssTarget = config.css.target

  return {
    name: '@tsdown/css',

    buildStart() {
      styles.clear()
    },

    async load(id) {
      if (!isCssOrPreprocessor(id)) return

      let code: string
      const deps: string[] = []

      const lang = getPreprocessorLang(id)
      if (lang) {
        const rawCode = await readFile(id, 'utf8')
        const preResult = await compilePreprocessor(
          lang,
          rawCode,
          id,
          config.css.preprocessorOptions,
        )
        code = preResult.code
        deps.push(...preResult.deps)

        code = await transformWithLightningCSS(code, id, {
          target: cssTarget,
          lightningcss: config.css.lightningcss,
          minify: shouldMinify,
        })
      } else if (RE_CSS.test(id)) {
        const bundleResult = await bundleWithLightningCSS(id, {
          target: cssTarget,
          lightningcss: config.css.lightningcss,
          minify: shouldMinify,
          preprocessorOptions: config.css.preprocessorOptions,
        })
        code = bundleResult.code
        deps.push(...bundleResult.deps)
      } else {
        return
      }

      for (const dep of deps) {
        this.addWatchFile(dep)
      }

      if (code.length && !code.endsWith('\n')) {
        code += '\n'
      }

      styles.set(id, code)
      return {
        code: '',
        moduleSideEffects: 'no-treeshake',
        moduleType: 'js',
      }
    },

    ...postHooks,
  }
}
