import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { defineConfig } from 'vitepress'
import { groupIconMdPlugin } from 'vitepress-plugin-group-icons'
import { getLocaleConfig } from './theme.ts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  locales: {
    root: getLocaleConfig('en'),
    'zh-CN': getLocaleConfig('zh-CN'),
    ru: {
      label: 'Русский (community)',
      link: 'https://github.com/teplostanski/tsdown.ru',
    },
  },

  buildEnd(siteConfig) {
    const assetsDir = path.resolve(siteConfig.outDir, 'assets')
    if (!fs.existsSync(assetsDir)) return

    for (const file of fs.readdirSync(assetsDir, { recursive: true })) {
      const fullPath = path.join(assetsDir, String(file))
      if (fs.statSync(fullPath).isFile() && fullPath.endsWith('.js')) {
        const code = fs.readFileSync(fullPath, 'utf8')
        if (code.includes('__vite__mapDeps') || code.includes('[]')) {
          const fixed = code.replaceAll(
            /(\[\]|__vite__mapDeps\([^)]*\))[a-f0-9]{32}/g,
            '$1',
          )
          if (fixed !== code) {
            fs.writeFileSync(fullPath, fixed)
          }
        }
      }
    }
  },

  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
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

  vite: {
    resolve: {
      alias: [
        {
          find: /^.*\/VPHero\.vue$/,
          replacement: fileURLToPath(
            new URL('../components/overrides/vp-hero.vue', import.meta.url),
          ),
        },
      ],
    },
  },
})
