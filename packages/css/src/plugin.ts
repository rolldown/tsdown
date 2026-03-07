import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  bundleWithLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'
import { resolveCssOptions, type ResolvedCssOptions } from './options.ts'
import { CssPostPlugin, type CssStyles } from './post.ts'
import { processWithPostCSS as runPostCSS } from './postcss.ts'
import { compilePreprocessor, getPreprocessorLang } from './preprocessors.ts'
import {
  CSS_LANGS_RE,
  getCleanId,
  RE_CSS,
  RE_CSS_INLINE,
  RE_INLINE,
} from './utils.ts'
import type { Plugin } from 'rolldown'
import type { ResolvedConfig } from 'tsdown'
import type { Logger } from 'tsdown/internal'

interface CssPluginConfig {
  css: ResolvedCssOptions
  cwd: string
  target?: string[]
}

export function CssPlugin(
  config: ResolvedConfig,
  { logger }: { logger: Logger },
): Plugin[] {
  const cssConfig: CssPluginConfig = {
    css: resolveCssOptions(config.css, config.target),
    cwd: config.cwd,
    target: config.target,
  }
  const styles: CssStyles = new Map()

  const transformPlugin: Plugin = {
    name: '@tsdown/css',

    buildStart() {
      styles.clear()
    },

    resolveId: {
      filter: { id: RE_CSS_INLINE },
      async handler(source, ...args) {
        const cleanSource = getCleanId(source)
        const resolved = await this.resolve(cleanSource, ...args)
        if (resolved) {
          return {
            ...resolved,
            id: `${resolved.id}?inline`,
          }
        }
      },
    },

    load: {
      filter: { id: RE_CSS_INLINE },
      async handler(id) {
        const cleanId = getCleanId(id)
        // Only handle real files; virtual CSS modules are loaded by their own plugins
        if (styles.has(id)) return

        const code = await readFile(cleanId, 'utf8').catch(() => null)
        if (code == null) return

        return {
          code,
          moduleType: 'js',
        }
      },
    },

    transform: {
      filter: { id: CSS_LANGS_RE },
      async handler(code, id) {
        const cleanId = getCleanId(id)
        const isInline = RE_INLINE.test(id)

        // Skip CSS files with non-inline queries (e.g. ?raw handled by other plugins),
        // but allow through virtual CSS from other plugins (e.g. Vue SFC `lang.css`)
        // where the clean path itself is not a CSS file.
        if (id !== cleanId && !isInline && CSS_LANGS_RE.test(cleanId)) return

        const deps: string[] = []

        if (cssConfig.css.transformer === 'lightningcss') {
          code = await processWithLightningCSS(
            code,
            id,
            cleanId,
            deps,
            cssConfig,
            logger,
          )
        } else {
          code = await processWithPostCSS(code, id, cleanId, deps, cssConfig)
        }

        for (const dep of deps) {
          this.addWatchFile(dep)
        }

        if (code.length && !code.endsWith('\n')) {
          code += '\n'
        }

        if (isInline) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            moduleSideEffects: false,
            moduleType: 'js',
          }
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

  if (cssConfig.css.inject) {
    // Inject plugin runs BEFORE CssPostPlugin so it can see pure CSS chunks
    // before they are removed, and rewrite their imports to CSS asset paths.
    const injectPlugin: Plugin = {
      name: '@tsdown/css:inject',

      generateBundle(_outputOptions, bundle) {
        const chunks = Object.values(bundle)
        // Identify pure CSS chunks and empty CSS wrapper chunks
        const pureCssChunks = new Set<string>()
        for (const chunk of chunks) {
          if (
            chunk.type !== 'chunk' ||
            chunk.exports.length ||
            !chunk.moduleIds.length ||
            chunk.isEntry ||
            chunk.isDynamicEntry
          )
            continue
          // Strict: all modules are CSS
          if (chunk.moduleIds.every((id) => styles.has(id))) {
            pureCssChunks.add(chunk.fileName)
            continue
          }
          // Relaxed: chunk has CSS modules and code is trivially empty
          // (e.g. a JS file whose only purpose is `import './foo.css'`)
          if (
            chunk.moduleIds.some((id) => styles.has(id)) &&
            isEmptyChunkCode(chunk.code)
          ) {
            pureCssChunks.add(chunk.fileName)
          }
        }

        for (const chunk of chunks) {
          if (chunk.type !== 'chunk') continue
          if (pureCssChunks.has(chunk.fileName)) continue

          if (cssConfig.css.splitting) {
            // Rewrite pure CSS chunk imports in-place: swap .mjs/.cjs/.js → .css
            // This preserves import order and sourcemap line positions.
            for (const imp of chunk.imports) {
              if (!pureCssChunks.has(imp)) continue
              const basename = path.basename(imp)
              const escaped = basename.replaceAll(
                /[.*+?^${}()|[\]\\]/g,
                String.raw`\$&`,
              )
              const cssBasename = basename.replace(/\.[cm]?js$/, '.css')
              const importRE = new RegExp(
                String.raw`(\bimport\s*["'][^"']*)${escaped}(["'];)`,
              )
              chunk.code = chunk.code.replace(importRE, `$1${cssBasename}$2`)
            }
            // Direct CSS modules in this chunk need a prepended import
            if (chunk.moduleIds.some((id) => styles.has(id))) {
              const cssFile = chunk.fileName.replace(/\.[cm]?js$/, '.css')
              const relativePath = path.posix.relative(
                path.posix.dirname(chunk.fileName),
                cssFile,
              )
              const importPath =
                relativePath[0] === '.' ? relativePath : `./${relativePath}`
              chunk.code = `import '${importPath}';\n${chunk.code}`
              if (chunk.map) {
                chunk.map.mappings = `;${chunk.map.mappings}`
              }
            }
          } else {
            const hasCss =
              chunk.moduleIds.some((id) => styles.has(id)) ||
              chunk.imports.some((imp) => pureCssChunks.has(imp))
            if (hasCss) {
              const cssFile = cssConfig.css.fileName
              const relativePath = path.posix.relative(
                path.posix.dirname(chunk.fileName),
                cssFile,
              )
              const importPath =
                relativePath[0] === '.' ? relativePath : `./${relativePath}`
              chunk.code = `import '${importPath}';\n${chunk.code}`
              if (chunk.map) {
                chunk.map.mappings = `;${chunk.map.mappings}`
              }
            }
          }
        }
      },
    }
    plugins.push(injectPlugin)
  }

  plugins.push(CssPostPlugin(cssConfig.css, styles))
  return plugins
}

async function processWithLightningCSS(
  code: string,
  id: string,
  cleanId: string,
  deps: string[],
  config: CssPluginConfig,
  logger: Logger,
): Promise<string> {
  const lang = getPreprocessorLang(cleanId)

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

  // Virtual modules (with query strings) can't use file-based bundling;
  // ?inline is excluded because the underlying file is real.
  if (id !== cleanId && !RE_INLINE.test(id)) {
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
  config: CssPluginConfig,
): Promise<string> {
  const lang = getPreprocessorLang(cleanId)

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

function isEmptyChunkCode(code: string): boolean {
  return !code
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/[^\n]*/g, '')
    .replaceAll(/\bexport\s*\{\s*\};?/g, '')
    .replaceAll(/\bimport\s*["'][^"']*["'];?/g, '')
    .trim()
}
