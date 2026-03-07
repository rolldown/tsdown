import { CssPostPlugin, type CssStyles } from './post.ts'
import type { ResolvedConfig } from '../../config/index.ts'
import type { Plugin } from 'rolldown'

export const RE_CSS: RegExp = /\.css$/

export function getCleanId(id: string): string {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1 ? id : id.slice(0, queryIndex)
}

export function CssPlugin(config: ResolvedConfig): Plugin[] {
  const styles: CssStyles = new Map()

  return [
    {
      name: 'tsdown:css',

      buildStart() {
        styles.clear()
      },
      transform: {
        filter: { id: RE_CSS },
        handler(code, id) {
          if (code.length && !code.endsWith('\n')) {
            code += '\n'
          }

          styles.set(id, code)
          return {
            code: '',
            moduleSideEffects: 'no-treeshake',
            moduleType: 'js',
          }
        },
      },
    },

    CssPostPlugin(config.css, styles),
  ]
}
