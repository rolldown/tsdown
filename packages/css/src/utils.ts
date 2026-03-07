export const RE_CSS: RegExp = /\.css$/

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}
