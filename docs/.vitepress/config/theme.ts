import { createTranslate } from '../i18n/utils'
import type { DefaultTheme, HeadConfig, LocaleConfig } from 'vitepress'

export function getLocaleConfig(lang: string) {
  const t = createTranslate(lang)

  const urlPrefix = lang && lang !== 'en' ? (`/${lang}` as const) : ''
  const title = t('tsdown')
  const titleTemplate = ':title - The Elegant Bundler for Libraries'
  const description = t('The Elegant Bundler for Libraries.')

  const head: HeadConfig[] = [
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
        content: `tsdown | ${description}`,
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
  ]

  const nav: DefaultTheme.NavItem[] = [
    { text: t('Home'), link: `${urlPrefix}/` },
    { text: t('Guide'), link: `${urlPrefix}/guide/` },
    {
      text: t('API Reference'),
      link: `${urlPrefix}/reference/config-options.md`,
    },
  ]

  const sidebar: DefaultTheme.SidebarItem[] = [
    {
      base: `${urlPrefix}/guide`,
      items: [
        {
          text: t('Guide'),
          items: [
            { text: t('Introduction'), link: '/index.md' },
            { text: t('Getting Started'), link: '/getting-started.md' },
            { text: t('Migrate from tsup'), link: '/migrate-from-tsup.md' },
          ],
        },
        {
          text: t('Recipes'),
          items: [
            { text: t('Cleaning'), link: '/cleaning.md' },
            { text: t('Config file'), link: '/config-file.md' },
            { text: t('Minification'), link: '/minification.md' },
            { text: t('Output directory'), link: '/output-directory.md' },
            { text: t('Output format'), link: '/output-format.md' },
            { text: t('Platform'), link: '/platform.md' },
            { text: t('Silent mode'), link: '/silent-mode.md' },
            { text: t('Sourcemap'), link: '/sourcemap.md' },
            { text: t('Target'), link: '/target.md' },
            { text: t('Tree shaking'), link: '/tree-shaking.md' },
            { text: t('Watch Mode'), link: '/watch-mode.md' },
          ],
        },
      ],
    },
    {
      text: t('API Reference'),
      base: `${urlPrefix}/reference`,
      items: [
        { text: t('Config Options'), link: '/config-options.md' },
        { text: t('Command Line Interface'), link: '/cli.md' },
      ],
    },
  ]

  const themeConfig: DefaultTheme.Config = {
    logo: { src: '/tsdown.svg', width: 24, height: 24 },
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
      copyright: 'Copyright © 2025-present VoidZero Inc.',
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
    titleTemplate,
    description,
    head,
    themeConfig,
  }

  return localeConfig
}
