import {
  createCssPostHooks,
  getCleanId,
  RE_CSS,
  type CssStyles,
} from 'tsdown/css'
import {
  bundleWithLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'
import { processWithPostCSS as runPostCSS } from './postcss.ts'
import {
  compilePreprocessor,
  getPreprocessorLang,
  isCssOrPreprocessor,
} from './preprocessors.ts'
import type { MinimalLogger } from './types.ts'
import type { Plugin } from 'rolldown'
import type { ResolvedConfig } from 'tsdown'

export function CssPlugin(
  config: ResolvedConfig,
  { logger }: { logger: MinimalLogger },
): Plugin {
  const styles: CssStyles = new Map()
  const postHooks = createCssPostHooks(config, styles)

  return {
    name: '@tsdown/css',

    buildStart() {
      styles.clear()
    },

    async transform(code, id) {
      if (!isCssOrPreprocessor(id)) return

      const cleanId = getCleanId(id)
      const deps: string[] = []

      if (config.css.transformer === 'lightningcss') {
        code = await processWithLightningCSS(
          code,
          id,
          cleanId,
          deps,
          config,
          logger,
        )
      } else {
        code = await processWithPostCSS(code, id, cleanId, deps, config)
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

async function processWithLightningCSS(
  code: string,
  id: string,
  cleanId: string,
  deps: string[],
  config: ResolvedConfig,
  logger: MinimalLogger,
): Promise<string> {
  const lang = getPreprocessorLang(id)

  if (lang) {
    const preResult = await compilePreprocessor(
      lang,
      code,
      cleanId,
      config.css.preprocessorOptions,
    )
    deps.push(...preResult.deps)

    return transformWithLightningCSS(preResult.code, cleanId, {
      target: config.css.target,
      lightningcss: config.css.lightningcss,
      minify: config.css.minify,
    })
  }

  // Virtual modules (with query strings) can't use file-based bundling
  if (id !== cleanId) {
    return transformWithLightningCSS(code, cleanId, {
      target: config.css.target,
      lightningcss: config.css.lightningcss,
      minify: config.css.minify,
    })
  }

  if (RE_CSS.test(cleanId)) {
    const bundleResult = await bundleWithLightningCSS(
      cleanId,
      {
        target: config.css.target,
        lightningcss: config.css.lightningcss,
        minify: config.css.minify,
        preprocessorOptions: config.css.preprocessorOptions,
        logger,
      },
      code,
    )
    deps.push(...bundleResult.deps)
    return bundleResult.code
  }

  return ''
}

async function processWithPostCSS(
  code: string,
  id: string,
  cleanId: string,
  deps: string[],
  config: ResolvedConfig,
): Promise<string> {
  const lang = getPreprocessorLang(id)

  if (lang) {
    const preResult = await compilePreprocessor(
      lang,
      code,
      cleanId,
      config.css.preprocessorOptions,
    )
    code = preResult.code
    deps.push(...preResult.deps)
  }

  const needInlineImport = code.includes('@import')
  const postcssResult = await runPostCSS(
    code,
    cleanId,
    config.css.postcss,
    config.cwd,
    needInlineImport,
  )
  code = postcssResult.code
  deps.push(...postcssResult.deps)

  return transformWithLightningCSS(code, cleanId, {
    target: config.css.target,
    lightningcss: config.css.lightningcss,
    minify: config.css.minify,
  })
}
