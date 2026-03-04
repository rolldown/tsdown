import { readFile } from 'node:fs/promises'
import { createCssPostHooks, RE_CSS, type CssStyles } from 'tsdown/css'
import {
  bundleWithLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'
import { processWithPostCSS } from './postcss.ts'
import {
  compilePreprocessor,
  getPreprocessorLang,
  isCssOrPreprocessor,
} from './preprocessors.ts'
import type { ResolvedConfig, Rolldown } from 'tsdown'

export function CssPlugin(config: ResolvedConfig): Rolldown.Plugin {
  const styles: CssStyles = new Map()
  const postHooks = createCssPostHooks(config, styles)

  return {
    name: '@tsdown/css',

    buildStart() {
      styles.clear()
    },

    async load(id) {
      if (!isCssOrPreprocessor(id)) return

      let code: string
      const deps: string[] = []

      if (config.css.transformer === 'lightningcss') {
        code = await loadWithLightningCSS(id, deps, config)
      } else {
        code = await loadWithPostCSS(id, deps, config)
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

async function loadWithLightningCSS(
  id: string,
  deps: string[],
  config: ResolvedConfig,
): Promise<string> {
  const lang = getPreprocessorLang(id)

  if (lang) {
    const rawCode = await readFile(id, 'utf8')
    const preResult = await compilePreprocessor(
      lang,
      rawCode,
      id,
      config.css.preprocessorOptions,
    )
    deps.push(...preResult.deps)

    return transformWithLightningCSS(preResult.code, id, {
      target: config.css.target,
      lightningcss: config.css.lightningcss,
      minify: config.css.minify,
    })
  } else if (RE_CSS.test(id)) {
    const bundleResult = await bundleWithLightningCSS(id, {
      target: config.css.target,
      lightningcss: config.css.lightningcss,
      minify: config.css.minify,
      preprocessorOptions: config.css.preprocessorOptions,
    })
    deps.push(...bundleResult.deps)
    return bundleResult.code
  }

  return ''
}

async function loadWithPostCSS(
  id: string,
  deps: string[],
  config: ResolvedConfig,
): Promise<string> {
  const lang = getPreprocessorLang(id)
  let code: string

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
  } else if (RE_CSS.test(id)) {
    code = await readFile(id, 'utf8')
  } else {
    return ''
  }

  const needInlineImport = code.includes('@import')
  const postcssResult = await processWithPostCSS(
    code,
    id,
    config.css.postcss,
    config.cwd,
    needInlineImport,
  )
  code = postcssResult.code
  deps.push(...postcssResult.deps)

  return transformWithLightningCSS(code, id, {
    target: config.css.target,
    lightningcss: config.css.lightningcss,
    minify: config.css.minify,
  })
}
