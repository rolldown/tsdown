import { readFile } from 'node:fs/promises'
import { createCssPostHooks, type CssStyles } from './post.ts'
import type { ResolvedConfig } from '../../config/index.ts'
import type { Plugin } from 'rolldown'

export const RE_CSS: RegExp = /\.css(?:$|\?)/

export function CssPlugin(config: ResolvedConfig): Plugin {
  const styles: CssStyles = new Map()
  const postHooks = createCssPostHooks(config, styles)

  return {
    name: 'tsdown:builtin-css',

    buildStart() {
      styles.clear()
    },

    load: {
      filter: {
        id: RE_CSS,
      },
      async handler(id) {
        let code = await readFile(id, 'utf8')
        if (code.length > 0 && !code.endsWith('\n')) {
          code += '\n'
        }
        styles.set(id, code)
        return { code: '', moduleSideEffects: 'no-treeshake', moduleType: 'js' }
      },
    },

    ...postHooks,
  }
}
