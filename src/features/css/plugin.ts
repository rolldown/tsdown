import { createCssPostHooks, type CssStyles } from './post.ts'
import type { ResolvedConfig } from '../../config/index.ts'
import type { Plugin } from 'rolldown'

export const RE_CSS: RegExp = /\.css$/

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

export function CssPlugin(config: ResolvedConfig): Plugin {
  const styles: CssStyles = new Map()
  const postHooks = createCssPostHooks(config, styles)

  return {
    name: 'tsdown:builtin-css',

    buildStart() {
      styles.clear()
    },

    transform(code, id) {
      if (!RE_CSS.test(id)) return
      if (code.length > 0 && !code.endsWith('\n')) {
        code += '\n'
      }
      styles.set(id, code)
      return { code: '', moduleSideEffects: 'no-treeshake', moduleType: 'js' }
    },

    ...postHooks,
  }
}
