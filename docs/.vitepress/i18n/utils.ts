import { translateMap } from './translate-map.ts'

export function t(key: string, lang: string) {
  return translateMap[lang]?.[key] || key
}

export function createTranslate(lang: string) {
  return (key: string) => t(key, lang)
}
