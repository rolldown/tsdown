export const RE_CSS: RegExp = /\.css$/
export const RE_INLINE: RegExp = /[?&]inline\b/
export const CSS_LANGS_RE: RegExp =
  /\.(?:css|less|sass|scss|styl|stylus)(?:$|\?)/
export const RE_CSS_INLINE: RegExp =
  /\.(?:css|less|sass|scss|styl|stylus)\?inline\b/

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}
