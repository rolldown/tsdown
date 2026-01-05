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
}

export const defaultCssBundleName = 'style.css'

export function resolveCssOptions(
  options: CssOptions = {},
): Required<CssOptions> {
  return {
    splitting: options.splitting ?? true,
    fileName: options.fileName ?? defaultCssBundleName,
  }
}
