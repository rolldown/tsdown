export const RE_CSS: RegExp = /\.css$/
export const RE_INLINE: RegExp = /[?&]inline\b/
export const CSS_LANGS_RE: RegExp = /\.(css|less|sass|scss|styl|stylus)(?:$|\?)/
export const RE_CSS_INLINE: RegExp =
  /\.(?:css|less|sass|scss|styl|stylus)\?(?:.*&)?inline\b/

export const CSS_MODULE_RE: RegExp =
  /\.module\.(?:css|less|sass|scss|styl|stylus)(?:$|\?)/

export const RE_CSS_LANG_TAIL: RegExp = /\.(?:css|less|sass|scss|styl|stylus)$/
// Vite's `SPECIAL_QUERY_RE` plus `?bytes` from unplugin-raw
export const RE_SPECIAL_QUERY: RegExp =
  /[?&](?:raw|url|bytes|worker|sharedworker)\b/

export function toCssFileName(jsFileName: string): string {
  return jsFileName.replace(/(?:\.module)?(\.[cm]?js)$/, '.css')
}

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

export function shouldSkipTransform(id: string, cleanId: string): boolean {
  if (id === cleanId || RE_INLINE.test(id)) return false
  if (!CSS_LANGS_RE.test(cleanId)) return false
  if (RE_SPECIAL_QUERY.test(id)) return true
  // Without a CSS tail (e.g. `&lang.css`) Rolldown doesn't treat the id as CSS either
  return !RE_CSS_LANG_TAIL.test(id)
}
