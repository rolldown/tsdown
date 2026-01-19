import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import 'virtual:group-icons.css'
import '@shikijs/vitepress-twoslash/style.css'
import './styles.css'
import 'uno.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue)
  },
} satisfies Theme
