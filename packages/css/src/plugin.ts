import { readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  bundleWithLightningCSS,
  transformWithLightningCSS,
} from './lightningcss.ts'
import { applyLocalsConvention, modulesToEsm } from './modules.ts'
import {
  resolveCssOptions,
  type CSSModulesOptions,
  type ResolvedCssOptions,
} from './options.ts'
import { CssPostPlugin, type CssStyles } from './post.ts'
import { processWithPostCSS as runPostCSS } from './postcss.ts'
import {
  compilePreprocessor,
  disposeSassCompiler,
  getPreprocessorLangFromId,
} from './preprocessors.ts'
import { findPureCssChunks } from './pure-chunk.ts'
import {
  CSS_LANGS_RE,
  CSS_MODULE_RE,
  cssChunkImportRE,
  getCleanId,
  RE_CSS,
  RE_CSS_INLINE,
  RE_INLINE,
  toCssFileName,
} from './utils.ts'
import type { CSSModulesConfig } from 'lightningcss'
import type { InternalModuleFormat, Plugin } from 'rolldown'
import type { ResolvedConfig } from 'tsdown'
import type { Logger } from 'tsdown/internal'

interface CssPluginConfig {
  css: ResolvedCssOptions
  cwd: string
  target?: string[]
  sourceMap: boolean
}

interface CssPluginResult {
  /** Plugins that run BEFORE user plugins (CSS compilation) */
  pre: Plugin[]
  /** Plugins that run AFTER user plugins (CSS collection & emission) */
  post: Plugin[]
}

function shouldSkipTransform(id: string, cleanId: string): boolean {
  const isInline = RE_INLINE.test(id)
  // Skip CSS files with non-inline queries (e.g. ?raw handled by other plugins),
  // but allow through virtual CSS from other plugins (e.g. Vue SFC `lang.css`)
  // where the clean path itself is not a CSS file.
  return id !== cleanId && !isInline && CSS_LANGS_RE.test(cleanId)
}

export function CssPlugin(
  config: ResolvedConfig,
  { logger, format }: { logger: Logger; format?: InternalModuleFormat },
): CssPluginResult {
  const cssConfig: CssPluginConfig = {
    css: resolveCssOptions(
      config.css || undefined,
      config.target,
      config.unbundle,
    ),
    cwd: config.cwd,
    target: config.target,
    sourceMap: Boolean(config.sourcemap),
  }
  const styles: CssStyles = new Map()
  const modulesMap = new Map<string, Record<string, string>>()

  // Pre-user plugin: compiles CSS (preprocessors, LightningCSS/PostCSS)
  // but does NOT convert to JS — allows user plugins (e.g. Vue scoped CSS)
  // to transform the compiled CSS before collection.
  const cssCompilePlugin: Plugin = {
    name: '@tsdown/css',

    buildStart() {
      styles.clear()
      modulesMap.clear()
    },

    closeBundle() {
      if (!this.meta.watchMode) {
        return disposeSassCompiler()
      }
    },

    closeWatcher() {
      return disposeSassCompiler()
    },

    resolveId: {
      filter: { id: RE_CSS_INLINE },
      async handler(source, ...args) {
        const resolved = await this.resolve(source, ...args)
        if (resolved) {
          return {
            ...resolved,
            id: `${getCleanId(resolved.id)}?inline`,
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

        this.addWatchFile(cleanId)

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
        if (shouldSkipTransform(id, cleanId)) return

        const isModule =
          cssConfig.css.modules !== false && CSS_MODULE_RE.test(id)

        const deps: string[] = []
        let modules: Record<string, string> | undefined
        let map: string | undefined

        if (cssConfig.css.transformer === 'lightningcss') {
          const result = await processWithLightningCSS(
            code,
            id,
            cleanId,
            deps,
            cssConfig,
            logger,
            isModule,
          )
          code = result.code
          modules = result.modules
          map = result.map
        } else {
          const result = await processWithPostCSS(
            code,
            id,
            cleanId,
            deps,
            cssConfig,
            isModule,
          )
          code = result.code
          modules = result.modules
          map = result.map
        }

        for (const dep of deps) {
          this.addWatchFile(dep)
        }

        if (code.length && !code.endsWith('\n')) {
          code += '\n'
        }

        if (modules) {
          const modulesConfig =
            typeof cssConfig.css.modules === 'object'
              ? cssConfig.css.modules
              : undefined
          if (cssConfig.css.transformer === 'lightningcss') {
            if (modulesConfig?.localsConvention) {
              modules = applyLocalsConvention(
                modules,
                modulesConfig.localsConvention,
                cleanId,
              )
            }
            modulesConfig?.getJSON?.(cleanId, modules, cleanId)
          }
          modulesMap.set(id, modules)
        }

        // Return compiled CSS without converting to JS.
        // User plugins can still transform this CSS (e.g. Vue scoped styles).
        // `map` is `null` when no real map is available (e.g. no transform ran),
        // which tells Rolldown the transform has no sourcemap instead of warning.
        return { code, map: map ?? null }
      },
    },
  }

  // Post-user plugin: collects final CSS (after user plugin transforms)
  // and converts CSS modules to JS exports.
  const cssCollectPlugin: Plugin = {
    name: '@tsdown/css:collect',

    transform: {
      filter: { id: CSS_LANGS_RE },
      handler(code, id) {
        const cleanId = getCleanId(id)
        if (shouldSkipTransform(id, cleanId)) return

        const isInline = RE_INLINE.test(id)

        // CSS is rewritten into a JS module here; there is no meaningful
        // CSS-to-JS sourcemap, so return `map: null` to silence Rolldown's
        // SOURCEMAP_BROKEN warning without claiming an incorrect map.
        if (isInline) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: null,
            moduleSideEffects: false,
            moduleType: 'js',
          }
        }

        if (code.length) {
          styles.set(id, code)
        }

        const modules = modulesMap.get(id)
        if (modules) {
          return {
            code: modulesToEsm(modules),
            map: null,
            moduleSideEffects: false,
            moduleType: 'js',
          }
        }

        return {
          code: '',
          map: null,
          moduleSideEffects: 'no-treeshake',
          moduleType: 'js',
        }
      },
    },
  }

  const postPlugins: Plugin[] = [cssCollectPlugin]

  let { inject } = cssConfig.css
  // iife/umd scripts run without a module loader, so neither `import` nor a
  // top-level `require()` works there; keep CSS as a plain asset.
  if (inject && format && format !== 'es' && format !== 'cjs') {
    logger.warn(
      `[@tsdown/css] \`css.inject\` is not supported for the \`${format}\` format and is ignored. Load the emitted CSS file manually.`,
    )
    inject = false
  }

  if (inject) {
    const getCssFile = (chunkFileName: string) =>
      cssConfig.css.splitting
        ? toCssFileName(chunkFileName)
        : cssConfig.css.fileName
    let outputFormat: InternalModuleFormat

    const injectPlugin: Plugin = {
      name: '@tsdown/css:inject',

      renderStart({ format }) {
        outputFormat = format
      },

      // Rolldown places `intro` after the shebang and directives (e.g.
      // `'use client'`) and keeps the sourcemap in sync.
      intro(chunk) {
        if (chunk.moduleIds.every((id) => !styles.has(id))) return ''
        const importPath = getRelativeImport(
          chunk.fileName,
          getCssFile(chunk.fileName),
        )
        return outputFormat === 'es'
          ? `import '${importPath}';`
          : `require('${importPath}');`
      },

      // Runs BEFORE CssPostPlugin so it can see pure CSS chunks before they
      // are removed, and rewrite their imports to CSS asset paths.
      generateBundle({ format }, bundle) {
        const pureCssChunks = findPureCssChunks(bundle, styles)

        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue
          if (pureCssChunks.has(chunk.fileName)) continue
          // Without splitting, all CSS lives in one file, which a chunk with
          // its own CSS already imports via `intro`.
          if (
            !cssConfig.css.splitting &&
            chunk.moduleIds.some((id) => styles.has(id))
          )
            continue

          // Rewrite pure CSS chunk imports in-place to their CSS files. This
          // preserves import order and sourcemap line positions.
          for (const imp of chunk.imports) {
            if (!pureCssChunks.has(imp)) continue
            const importPath = getRelativeImport(
              chunk.fileName,
              getCssFile(imp),
            )
            chunk.code = chunk.code.replace(
              cssChunkImportRE(path.basename(imp), format),
              `$1${importPath}$2`,
            )
            // One import of the single CSS file is enough; CssPostPlugin
            // removes the remaining imports of pure CSS chunks.
            if (!cssConfig.css.splitting) break
          }
        }
      },
    }
    postPlugins.push(injectPlugin)
  }

  postPlugins.push(CssPostPlugin(cssConfig.css, styles))

  return {
    pre: [cssCompilePlugin],
    post: postPlugins,
  }
}

interface ProcessResult {
  code: string
  map?: string
  modules?: Record<string, string>
}

function resolveCssModulesConfig(
  modulesOptions: CSSModulesOptions | false | undefined,
  lightningCssModules: boolean | CSSModulesConfig | undefined,
  isModule: boolean,
  logger: Logger,
): boolean | CSSModulesConfig | undefined {
  if (!isModule) return undefined

  const config = typeof modulesOptions === 'object' ? modulesOptions : undefined

  const cssModulesConfig: CSSModulesConfig =
    typeof lightningCssModules === 'object' ? { ...lightningCssModules } : {}
  if (typeof config?.generateScopedName === 'string') {
    cssModulesConfig.pattern = config.generateScopedName
  } else if (typeof config?.generateScopedName === 'function') {
    logger.warn(
      '[@tsdown/css] `generateScopedName` as a function is not supported with `transformer: "lightningcss"`. Use a string pattern or switch to `transformer: "postcss"`.',
    )
  }
  if (config?.scopeBehaviour === 'global') {
    cssModulesConfig.pattern = '[local]'
  }

  // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
  return Object.keys(cssModulesConfig).length > 0 ? cssModulesConfig : true
}

async function processWithLightningCSS(
  code: string,
  id: string,
  cleanId: string,
  deps: string[],
  config: CssPluginConfig,
  logger: Logger,
  isModule: boolean,
): Promise<ProcessResult> {
  const lang = getPreprocessorLangFromId(id)
  const cssModules = resolveCssModulesConfig(
    config.css.modules,
    config.css.lightningcss?.cssModules,
    isModule,
    logger,
  )

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
      cssModules,
      sourceMap: config.sourceMap,
    })
  }

  const isVirtual = id !== cleanId && !RE_INLINE.test(id)
  if (isVirtual) {
    const transformed = await transformWithLightningCSS(code, cleanId, {
      target: config.css.target,
      lightningcss: config.css.lightningcss,
      minify: config.css.minify,
      cssModules,
      sourceMap: config.sourceMap,
    })
    if (!transformed.hasExternalComposes) return transformed
    // Bundle from the supplied virtual source so Lightning CSS can resolve
    // cross-file compositions instead of exporting their raw class names.
  }

  if (isVirtual || RE_CSS.test(cleanId)) {
    const bundleResult = await bundleWithLightningCSS(
      cleanId,
      {
        target: config.css.target,
        lightningcss: config.css.lightningcss,
        minify: config.css.minify,
        cssModules,
        preprocessorOptions: config.css.preprocessorOptions,
        sourceMap: config.sourceMap,
        logger,
      },
      code,
    )
    deps.push(...bundleResult.deps)
    return {
      code: bundleResult.code,
      map: bundleResult.map,
      modules: bundleResult.modules,
    }
  }

  return { code: '' }
}

async function processWithPostCSS(
  code: string,
  id: string,
  cleanId: string,
  deps: string[],
  config: CssPluginConfig,
  isModule: boolean,
): Promise<ProcessResult> {
  const lang = getPreprocessorLangFromId(id)

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

  const modulesConfig =
    typeof config.css.modules === 'object' ? config.css.modules : undefined

  const needInlineImport = code.includes('@import')
  const postcssResult = await runPostCSS(
    code,
    cleanId,
    config.css.postcss,
    config.cwd,
    needInlineImport,
    isModule ? { isModule: true, config: modulesConfig } : undefined,
    config.sourceMap,
  )
  code = postcssResult.code
  deps.push(...postcssResult.deps)

  const transformResult = await transformWithLightningCSS(code, cleanId, {
    target: config.css.target,
    lightningcss: config.css.lightningcss,
    minify: config.css.minify,
    sourceMap: config.sourceMap,
    inputSourceMap: postcssResult.map,
  })

  // When LightningCSS skips its transform (no targets/minify), it returns no
  // map; fall back to the PostCSS map so the chain still has one.
  return {
    code: transformResult.code,
    map: transformResult.map ?? postcssResult.map,
    modules: postcssResult.modules,
  }
}

function getRelativeImport(from: string, to: string): string {
  const relativePath = path.posix.relative(path.posix.dirname(from), to)
  return relativePath[0] === '.' ? relativePath : `./${relativePath}`
}
