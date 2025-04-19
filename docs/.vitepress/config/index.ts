import { defineConfig } from 'vitepress'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
  localIconLoader,
} from 'vitepress-plugin-group-icons'
import llmstxt from 'vitepress-plugin-llms'
import { getLocaleConfig } from './theme'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    'zh-CN': getLocaleConfig('zh-CN'),
  },

  title: 'tsdown',
  description: 'An even faster bundler powered by Rolldown.',
  lastUpdated: true,
  cleanUrls: true,
  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/tsdown.svg',
      },
    ],
    ['meta', { name: 'theme-color', content: '#ff7e17' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    [
      'meta',
      {
        property: 'og:title',
        content: 'tsdown | Bundler powered by Rolldown',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://tsdown.dev/og-image.png',
      },
    ],
    ['meta', { property: 'og:site_name', content: 'Rolldown' }],
    ['meta', { property: 'og:url', content: 'https://rolldown.rs/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@rolldown_rs' }],
  ],

  themeConfig: {
    search: {
      provider: 'local',
    },

    logo: { src: '/tsdown.svg', width: 24, height: 24 },

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'User Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/config-options.md' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'User Guide',
          items: [
            { text: 'Introduction', link: '/guide/index.md' },
            { text: 'Getting Started', link: '/guide/getting-started.md' },
            { text: 'Migrate from tsup', link: '/guide/migrate-from-tsup.md' },
          ],
        },
        {
          text: 'Recipes',
          items: [
            { text: 'Cleaning', link: '/guide/cleaning.md' },
            { text: 'Config file', link: '/guide/config-file.md' },
            { text: 'Minification', link: '/guide/minification.md' },
            { text: 'Output directory', link: '/guide/output-directory.md' },
            { text: 'Output format', link: '/guide/output-format.md' },
            { text: 'Platform', link: '/guide/platform.md' },
            { text: 'Silent mode', link: '/guide/silent-mode.md' },
            { text: 'Sourcemap', link: '/guide/sourcemap.md' },
            { text: 'Target', link: '/guide/target.md' },
            { text: 'Tree shaking', link: '/guide/tree-shaking.md' },
            { text: 'Watch Mode', link: '/guide/watch-mode.md' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Config Options', link: '/reference/config-options.md' },
            { text: 'Command Line Interface', link: '/reference/cli.md' },
          ],
        },
      ],
    },

    outline: 'deep',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rolldown/tsdown' },
      { icon: 'npm', link: 'https://npmjs.com/package/tsdown' },
      { icon: 'jsr', link: 'https://jsr.io/@sxzz/tsdown' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present VoidZero Inc.',
    },
  },

  vite: {
    plugins: [
      groupIconVitePlugin({
        customIcon: {
          rolldown: localIconLoader(
            import.meta.url,
            '../../public/lightning-down.svg',
          ),
        },
      }) as any,
      llmstxt({
        ignoreFiles: ['index.md', 'README.md'],
        description: 'tsdown is an even faster bundler powered by Rolldown.',
        details: '',
      }),
    ],
  },
  markdown: {
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
})
