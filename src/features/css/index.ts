import { resolveComma, toArray } from '../../utils/general.ts'

export interface CssOptions {
  /**
   * Enable/disable CSS code splitting.
   * When set to `false`, all CSS in the entire project will be extracted into a single CSS file.
   * When set to `true`, CSS imported in async JS chunks will be preserved as chunks.
   * @default false
   */
  splitting?: boolean

  /**
   * Specify the name of the CSS file.
   * @default 'style.css'
   */
  fileName?: string

  /**
   * Set the target environment for CSS syntax lowering.
   * Accepts esbuild-style target strings (e.g., `'chrome99'`, `'safari16.2'`).
   * Defaults to the top-level `target` option.
   *
   * Requires `@tsdown/css` to be installed.
   *
   * @see https://vite.dev/config/build-options#build-csstarget
   */
  target?: string | string[] | false

  /**
   * Options for CSS preprocessors (Sass/Less/Stylus).
   *
   * In addition to options specific to each processor, `additionalData` option
   * can be used to inject extra code for each style content.
   *
   * Requires `@tsdown/css` to be installed.
   */
  preprocessorOptions?: PreprocessorOptions

  /**
   * Enable/disable CSS minification.
   *
   * Requires `@tsdown/css` to be installed.
   *
   * @default false
   */
  minify?: boolean

  /**
   * Lightning CSS options for CSS syntax lowering and transformations.
   *
   * Requires `@tsdown/css` to be installed.
   */
  lightningcss?: LightningCSSOptions
}

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

export type LightningCSSOptions = Record<string, any>

export interface ResolvedCssOptions {
  splitting: boolean
  fileName: string
  minify: boolean
  target?: string[]
  preprocessorOptions?: PreprocessorOptions
  lightningcss?: LightningCSSOptions
}

export const defaultCssBundleName = 'style.css'

export function resolveCssOptions(
  options: CssOptions = {},
  topLevelTarget?: string[],
): ResolvedCssOptions {
  let cssTarget: string[] | undefined
  if (options.target === false) {
    cssTarget = undefined
  } else if (options.target == null) {
    cssTarget = topLevelTarget
  } else {
    cssTarget = resolveComma(toArray(options.target))
  }

  return {
    splitting: options.splitting ?? false,
    fileName: options.fileName ?? defaultCssBundleName,
    minify: options.minify ?? false,
    target: cssTarget,
    preprocessorOptions: options.preprocessorOptions,
    lightningcss: options.lightningcss,
  }
}
