import type { InternalModuleFormat } from 'rolldown'

export const RE_CSS: RegExp = /\.css$/
export const RE_INLINE: RegExp = /[?&]inline\b/
export const CSS_LANGS_RE: RegExp = /\.(css|less|sass|scss|styl|stylus)(?:$|\?)/
export const RE_CSS_INLINE: RegExp =
  /\.(?:css|less|sass|scss|styl|stylus)\?(?:.*&)?inline\b/

export const CSS_MODULE_RE: RegExp =
  /\.module\.(?:css|less|sass|scss|styl|stylus)(?:$|\?)/

const RE_JS_EXT =
  /(?:\.module)?(?:\.(?:css|less|sass|scss|styl|stylus))?(\.[cm]?js)$/

export function toCssFileName(jsFileName: string): string {
  return jsFileName.replace(RE_JS_EXT, '.css')
}

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

export function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/**
 * Match the module request of a pure CSS chunk in generated code:
 * `import "..."` for ESM output and `require("...")` otherwise, consistent
 * with `getEmptyChunkReplacer`. Minifiers may emit template literals in
 * `require()` calls.
 */
export function cssChunkImportRE(
  fileName: string,
  format: InternalModuleFormat,
): RegExp {
  const escaped = escapeRegex(fileName)
  if (format === 'es') {
    return new RegExp(String.raw`(\bimport\s*["'][^"']*)${escaped}(["'];)`)
  }
  return new RegExp(
    String.raw`(\brequire\(\s*["'\`][^"'\`]*)${escaped}(["'\`]\s*\))`,
  )
}
