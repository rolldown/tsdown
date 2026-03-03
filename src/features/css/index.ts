import type { TransformOptions } from 'lightningcss'

export interface CssOptions {
  /**
   * Enable/disable CSS code splitting.
   * When set to `false`, all CSS in the entire project will be extracted into a single CSS file.
   * When set to `true`, CSS imported in async JS chunks will be preserved as chunks.
   * @default true
   */
  splitting?: boolean

  /**
   * Specify the name of the CSS file.
   * @default 'style.css'
   */
  fileName?: string

  /**
   * Options for CSS preprocessors.
   *
   * In addition to options specific to each processor, `additionalData` option
   * can be used to inject extra code for each style content.
   */
  preprocessorOptions?: PreprocessorOptions

  /**
   * Lightning CSS options for CSS syntax lowering and transformations.
   * Requires `lightningcss` to be installed.
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

export type LightningCSSOptions = Omit<
  TransformOptions<any>,
  'filename' | 'code' | 'minify' | 'sourceMap' | 'inputSourceMap'
>

export interface ResolvedCssOptions {
  splitting: boolean
  fileName: string
  preprocessorOptions?: PreprocessorOptions
  lightningcss?: LightningCSSOptions
}

export const defaultCssBundleName = 'style.css'

export function resolveCssOptions(
  options: CssOptions = {},
): ResolvedCssOptions {
  return {
    splitting: options.splitting ?? true,
    fileName: options.fileName ?? defaultCssBundleName,
    preprocessorOptions: options.preprocessorOptions,
    lightningcss: options.lightningcss,
  }
}
