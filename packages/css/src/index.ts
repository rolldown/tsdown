import path from 'node:path'
import { CssPostPlugin, getCleanId, RE_CSS, type CssStyles } from 'tsdown/css'
import {
  bundleWithLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'
import { processWithPostCSS as runPostCSS } from './postcss.ts'
import { compilePreprocessor, getPreprocessorLang } from './preprocessors.ts'
import type { MinimalLogger } from './types.ts'
import type { Plugin } from 'rolldown'
import type { ResolvedConfig } from 'tsdown'

const CSS_LANGS_RE = /\.(?:css|less|sass|scss|styl|stylus)$/

export function CssPlugin(
  config: ResolvedConfig,
  { logger }: { logger: MinimalLogger },
): Plugin[] {
  const styles: CssStyles = new Map()

  const transformPlugin: Plugin = {
    name: '@tsdown/css',

    buildStart() {
      styles.clear()
    },

    transform: {
      filter: { id: CSS_LANGS_RE },
      async handler(code, id) {
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
    },
  }

  const plugins: Plugin[] = [transformPlugin]

  if (config.css.inject) {
    // Inject plugin runs BEFORE CssPostPlugin so it can see pure CSS chunks
    // before they are removed, and rewrite their imports to CSS asset paths.
    const injectPlugin: Plugin = {
      name: '@tsdown/css:inject',

      generateBundle(_outputOptions, bundle) {
        // Identify pure CSS chunks (same logic as removePureCssChunks)
        const pureCssChunks = new Set<string>()
        for (const chunk of Object.values(bundle)) {
          if (
            chunk.type === 'chunk' &&
            !chunk.exports.length &&
            chunk.moduleIds.length &&
            chunk.moduleIds.every((id) => styles.has(id))
          ) {
            pureCssChunks.add(chunk.fileName)
          }
        }

        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue
          if (pureCssChunks.has(chunk.fileName)) continue

          const cssFiles: string[] = []

          if (config.css.splitting) {
            // Direct CSS modules in this chunk
            if (chunk.moduleIds.some((id) => styles.has(id))) {
              cssFiles.push(chunk.fileName.replace(/\.[cm]?js$/, '.css'))
            }
            // CSS from imported pure CSS chunks
            for (const imp of chunk.imports) {
              if (pureCssChunks.has(imp)) {
                const cssFile = imp.replace(/\.[cm]?js$/, '.css')
                cssFiles.push(cssFile)
                // Remove the pure CSS chunk import from code so
                // removePureCssChunks won't replace it with /* empty css */
                const escaped = path
                  .basename(imp)
                  .replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
                const importRE = new RegExp(
                  String.raw`\bimport\s*["'][^"']*${escaped}["'];\n?`,
                )
                chunk.code = chunk.code.replace(importRE, '')
              }
            }
          } else {
            const hasCss =
              chunk.moduleIds.some((id) => styles.has(id)) ||
              chunk.imports.some((imp) => pureCssChunks.has(imp))
            if (hasCss) {
              cssFiles.push(config.css.fileName)
            }
          }

          for (const cssFile of cssFiles) {
            const relativePath = path.posix.relative(
              path.posix.dirname(chunk.fileName),
              cssFile,
            )
            const importPath =
              relativePath[0] === '.' ? relativePath : `./${relativePath}`
            chunk.code = `import '${importPath}';\n${chunk.code}`
            // Shift sourcemap by one line to account for prepended import
            if (chunk.map) {
              chunk.map.mappings = `;${chunk.map.mappings}`
            }
          }
        }
      },
    }
    plugins.push(injectPlugin)
  }

  plugins.push(CssPostPlugin(config.css, styles))
  return plugins
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
