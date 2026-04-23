import {
  expandBaselineTarget,
  resolveComma,
  toArray,
  type MarkPartial,
  type Overwrite,
} from 'tsdown/internal'
import type { TransformOptions } from 'lightningcss'

export type LightningCSSOptions = Omit<
  TransformOptions<any>,
  'filename' | 'code'
>

export interface CSSModulesOptions {
  /**
   * Controls the scoping behavior.
   * @default 'local'
   */
  scopeBehaviour?: 'global' | 'local'

  /**
   * File paths matching these patterns will use global scoping.
   */
  globalModulePaths?: RegExp[]

  /**
   * Pattern or function to generate scoped class names.
   * When using `transformer: 'lightningcss'`, only string patterns are supported.
   */
  generateScopedName?:
    | string
    | ((name: string, filename: string, css: string) => string)

  /**
   * Prefix added to hashes when generating scoped names.
   */
  hashPrefix?: string

  /**
   * Transform convention for exported class names.
   */
  localsConvention?: 'camelCase' | 'camelCaseOnly' | 'dashes' | 'dashesOnly'

  /**
   * Whether to include global class names in the export.
   */
  exportGlobals?: boolean

  /**
   * Callback to receive the generated class name mappings.
   */
  getJSON?: (
    cssFileName: string,
    json: Record<string, string>,
    outputFileName: string,
  ) => void
}

export interface CssOptions {
  /**
   * Enable/disable CSS code splitting.
   * When set to `false`, all CSS in the entire project will be extracted into
   * a single CSS file named by {@linkcode fileName}.
   * When set to `true`, CSS imported in async JS chunks will be preserved as chunks.
   *
   * Defaults to `false`, but if `unbundle` is `true`, it defaults to `true` to preserve chunk splitting.
   */
  splitting?: boolean

  /**
   * Specify the name of the CSS file generated when {@linkcode splitting} is
   * `false`.
   *
   * @default 'style.css'
   */
  fileName?: string

  /**
   * Set the target environment for CSS syntax lowering.
   * Accepts esbuild-style target strings (e.g., `'chrome99'`, `'safari16.2'`).
   * Defaults to the top-level `target` option.
   *
   * @see https://vite.dev/config/build-options#build-csstarget
   * @default tsdownConfig.target
   */
  target?: string | string[] | false

  /**
   * Options for CSS preprocessors (Sass/Less/Stylus).
   *
   * In addition to options specific to each processor, `additionalData` option
   * can be used to inject extra code for each style content.
   */
  preprocessorOptions?: PreprocessorOptions

  /**
   * Enable/disable CSS minification.
   *
   * @default false
   */
  minify?: boolean

  /**
   * Lightning CSS options for CSS syntax lowering and transformations.
   */
  lightningcss?: LightningCSSOptions

  /**
   * PostCSS configuration.
   *
   * - `string`: Path to the directory to search for PostCSS config files.
   * - `object`: Inline PostCSS options with optional `plugins` array.
   * - Omitted: Auto-detect PostCSS config from the project root.
   *
   * Only used when {@linkcode transformer} is `'postcss'`.
   * Requires `postcss` to be installed.
   *
   * @see https://github.com/postcss/postcss
   */
  postcss?: PostCSSOptions

  /**
   * When enabled, JS output preserves import statements pointing to emitted CSS files.
   * Consumers of the library will automatically import the CSS alongside the JS.
   *
   * @default false
   */
  inject?: boolean

  /**
   * CSS modules configuration.
   * When not `false`, `.module.css` files (and preprocessor variants) are
   * treated as CSS modules with scoped class names.
   *
   * @see https://github.com/css-modules/css-modules
   *
   * @default {}
   */
  modules?: CSSModulesOptions | false

  /**
   * CSS transformer to use. Controls how CSS is processed:
   *
   * - `'lightningcss'` (default): `@import` handled by Lightning CSS
   *   `bundleAsync()`, PostCSS is **not** used at all.
   * - `'postcss'`: `@import` handled by `postcss-import`,
   *   PostCSS plugins applied, Lightning CSS used only for final
   *   targets/minify transform.
   *
   * @default 'lightningcss'
   * @see https://vite.dev/config/shared-options#css-transformer
   */
  transformer?: 'postcss' | 'lightningcss'
}

export type PostCSSOptions =
  | string
  | (Record<string, any> & { plugins?: any[] })

export interface PreprocessorOptions {
  scss?: SassPreprocessorOptions
  sass?: SassPreprocessorOptions
  less?: LessPreprocessorOptions
  styl?: StylusPreprocessorOptions
  stylus?: StylusPreprocessorOptions
}

export type PreprocessorAdditionalDataResult =
  | string
  | { content: string; map?: any }

export type PreprocessorAdditionalData =
  | string
  | ((
      source: string,
      filename: string,
    ) =>
      | PreprocessorAdditionalDataResult
      | Promise<PreprocessorAdditionalDataResult>)

export interface SassPreprocessorOptions {
  additionalData?: PreprocessorAdditionalData
  [key: string]: any
}

export interface LessPreprocessorOptions {
  additionalData?: PreprocessorAdditionalData
  math?: any
  paths?: string[]
  plugins?: any[]
  [key: string]: any
}

export interface StylusPreprocessorOptions {
  additionalData?: PreprocessorAdditionalData
  define?: Record<string, any>
  paths?: string[]
  [key: string]: any
}

export type ResolvedCssOptions = Overwrite<
  MarkPartial<
    Required<CssOptions>,
    'preprocessorOptions' | 'lightningcss' | 'postcss' | 'modules'
  >,
  { target?: string[] }
>

export const defaultCssBundleName = 'style.css'

export function resolveCssOptions(
  options: CssOptions = {},
  topLevelTarget?: string[],
  unbundle?: boolean,
): ResolvedCssOptions {
  let cssTarget: string[] | undefined
  if (options.target === false) {
    cssTarget = undefined
  } else if (options.target == null) {
    cssTarget = topLevelTarget
  } else {
    cssTarget = expandBaselineTarget(resolveComma(toArray(options.target)))
  }

  return {
    transformer: options.transformer ?? 'lightningcss',
    splitting: options.splitting ?? !!unbundle,
    fileName: options.fileName ?? defaultCssBundleName,
    minify: options.minify ?? false,
    inject: options.inject ?? false,
    modules: options.modules === false ? false : (options.modules ?? {}),
    target: cssTarget,
    preprocessorOptions: options.preprocessorOptions,
    lightningcss: options.lightningcss,
    postcss: options.postcss,
  }
}
