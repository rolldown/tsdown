export const PREPROCESSOR_LANG_SOURCE = 'sass|scss|less|styl|stylus'

const CSS_LANG_SOURCE = `css|${PREPROCESSOR_LANG_SOURCE}`
export const PREPROCESSOR_QUERY_LANG_RE: RegExp = new RegExp(
  String.raw`(?:\?|&)lang(?:=|\.)(${PREPROCESSOR_LANG_SOURCE})(?:&|$)`,
)

export const RE_CSS: RegExp = /\.css$/
export const RE_INLINE: RegExp = /[?&]inline\b/
export const CSS_LANGS_RE: RegExp = new RegExp(
  String.raw`\.(?:${CSS_LANG_SOURCE})(?:$|\?)|[?&]lang(?:=|\.)(?:${CSS_LANG_SOURCE})(?:&|$)`,
)
export const RE_CSS_INLINE: RegExp = new RegExp(
  String.raw`\.(?:${CSS_LANG_SOURCE})\?(?:.*&)?inline\b`,
)

export const CSS_MODULE_RE: RegExp = new RegExp(
  String.raw`\.module\.(?:${CSS_LANG_SOURCE})(?:$|\?)`,
)

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}
