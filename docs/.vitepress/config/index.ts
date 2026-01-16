import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { extendConfig } from '@voidzero-dev/vitepress-theme/config.js'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin } from 'vitepress-plugin-group-icons'
import { getLocaleConfig } from './theme.ts'

export default extendConfig(
  defineConfig({
    locales: {
      root: getLocaleConfig('en'),
      'zh-CN': getLocaleConfig('zh-CN'),
      ru: {
        label: 'Русский (community)',
        link: 'https://github.com/teplostanski/tsdown.ru',
      },
    },

    sitemap: {
      hostname: 'https://tsdown.dev',
    },

    lastUpdated: true,
    cleanUrls: true,
    themeConfig: {
      variant: 'rolldown',

      outline: 'deep',
      socialLinks: [
        { icon: 'github', link: 'https://github.com/rolldown/tsdown' },
        { icon: 'npm', link: 'https://npmjs.com/package/tsdown' },
        // { icon: 'jsr', link: 'https://jsr.io/@sxzz/tsdown' },
      ],
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025-present VoidZero Inc. & Contributors',
      },

      search: {
        provider: 'local',
        options: {
          locales: {
            'zh-CN': {
              translations: {
                button: {
                  buttonText: '搜索文档',
                  buttonAriaLabel: '搜索文档',
                },
                modal: {
                  noResultsText: '无法找到相关结果',
                  resetButtonTitle: '清除查询条件',
                  footer: {
                    selectText: '选择',
                    navigateText: '切换',
                    closeText: '关闭',
                  },
                },
              },
            },
          },
        },
      },
    },

    markdown: {
      config(md) {
        md.use(groupIconMdPlugin)
      },
      codeTransformers: [
        transformerTwoslash({
          twoslashOptions: {
            compilerOptions: {
              paths: {
                tsdown: ['../src/index.ts'],
              },
            },
          },
        }),
      ],
    },

    // vite: {
    //   resolve: {
    //     alias: [
    //       {
    //         find: /^.*\/VPHero\.vue$/,
    //         replacement: fileURLToPath(
    //           new URL('../components/overrides/vp-hero.vue', import.meta.url),
    //         ),
    //       },
    //     ],
    //   },
    // },
  }),
)
