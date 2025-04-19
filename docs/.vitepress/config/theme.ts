import { createTranslate } from '../i18n/utils'
import type { DefaultTheme, LocaleConfig } from 'vitepress'

export function getLocaleConfig(lang: string) {
  const t = createTranslate(lang)

  const urlPrefix = lang && lang !== 'en' ? (`/${lang}` as const) : ''
  const title = t('tsdown')
  const description = t('An even faster bundler powered by Rolldown.')

  const nav: DefaultTheme.NavItem[] = [
    { text: t('Home'), link: `${urlPrefix}/` },
    { text: t('User Guide'), link: `${urlPrefix}/guide/` },
    { text: t('Reference'), link: `${urlPrefix}/reference/config-options.md` },
  ]

  const sidebar: DefaultTheme.Sidebar = {
    '/guide/': [
      {
        text: t('User Guide'),
        items: [
          { text: t('Introduction'), link: `${urlPrefix}/guide/index.md` },
          {
            text: t('Getting Started'),
            link: `${urlPrefix}/guide/getting-started.md`,
          },
        ],
      },
      {
        text: t('Recipes'),
        items: [
          {
            text: t('Multiple builds'),
            link: `${urlPrefix}/guide/multiple-builds.md`,
          },
        ],
      },
    ],
    '/reference/': [
      {
        text: t('Reference'),
        items: [
          {
            text: t('Config Options'),
            link: `${urlPrefix}/reference/config-options.md`,
          },
          {
            text: t('Command Line Interface'),
            link: `${urlPrefix}/reference/cli.md`,
          },
        ],
      },
    ],
  }

  const themeConfig: DefaultTheme.Config = {
    logo: '/logo.svg',
    nav,
    sidebar,
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
  }

  if (lang === 'zh-CN') {
    Object.assign(themeConfig, {
      outline: {
        label: '页面导航',
      },
      lastUpdatedText: '最后更新于',
      darkModeSwitchLabel: '外观',
      sidebarMenuLabel: '目录',
      returnToTopLabel: '返回顶部',
      langMenuLabel: '选择语言',
      docFooter: {
        prev: '上一页',
        next: '下一页',
      },
    } satisfies DefaultTheme.Config)
  }

  const localeConfig: LocaleConfig<DefaultTheme.Config>[string] = {
    label: t('English'),
    lang: t('en'),
    title,
    description,
    head: [],
    themeConfig,
  }

  return localeConfig
}
