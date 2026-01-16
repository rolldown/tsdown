import monoIcon from '@assets/icons/rolldown-mono.svg'
import footerBg from '@assets/rolldown/footer-background.jpg'
import TwoslashFloatingVue from '@shikijs/vitepress-twoslash/client'
import BaseTheme, { themeContextKey } from '@voidzero-dev/vitepress-theme'
import type { Theme } from 'vitepress'

import 'virtual:group-icons.css'
import '@voidzero-dev/vitepress-theme/src/styles/index.css'
import '@shikijs/vitepress-twoslash/style.css'
// import 'uno.css'

export default {
  extends: BaseTheme,
  enhanceApp({ app }) {
    app.use(TwoslashFloatingVue)
    app.provide(themeContextKey, {
      logoDark: 'https://rolldown.rs/assets/rolldown-light.CgGa0HQi.svg',
      logoLight: 'https://rolldown.rs/assets/rolldown-light.CgGa0HQi.svg',
      logoAlt: 'tsdown',
      footerBg,
      monoIcon,
    })
  },
} satisfies Theme
