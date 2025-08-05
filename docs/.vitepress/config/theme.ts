import { existsSync } from 'node:fs'
import path from 'node:path'
import { createTranslate } from '../i18n/utils'
import type { DefaultTheme, HeadConfig, LocaleConfig } from 'vitepress'

async function getTypedocSidebar() {
  const filepath = path.resolve(
    import.meta.dirname,
    '../../reference/api/typedoc-sidebar.json',
  )
  if (!existsSync(filepath)) return []

  try {
    return (await import(filepath, { with: { type: 'json' } }))
      .default as DefaultTheme.SidebarItem[]
  } catch (error) {
    console.error('Failed to load typedoc sidebar:', error)
    return []
  }
}

const typedocSidebar = await getTypedocSidebar()

export function getLocaleConfig(lang: string) {
  const t = createTranslate(lang)

  const urlPrefix = lang && lang !== 'en' ? (`/${lang}` as const) : ''
  const title = t('tsdown')
  const description = t('The Elegant Bundler for Libraries')
  const titleTemplate = `:title - ${description}`

  const docsLink = `https://tsdown.dev/`
  const ogImage = `${docsLink}og-image.png`

  const head: HeadConfig[] = [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/tsdown.svg' }],
    ['meta', { name: 'theme-color', content: '#ff7e17' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: docsLink }],
    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { property: 'twitter:image', content: ogImage }],
    [
      'script',
      {
        src: 'https://cdn.usefathom.com/script.js',
        'data-site': 'KEZOQJNE',
        defer: '',
      },
    ],
  ]

  const nav: DefaultTheme.NavItem[] = [
    { text: t('Home'), link: `${urlPrefix}/` },
    { text: t('Guide'), link: `${urlPrefix}/guide/` },
    {
      text: t('API Reference'),
      link: `${urlPrefix}/reference/api/Interface.Options.md`,
    },
    { text: t('FAQ'), link: `${urlPrefix}/guide/faq.md` },
  ]

  const sidebar: DefaultTheme.SidebarItem[] = [
    {
      text: t('Guide'),
      base: `${urlPrefix}/guide`,
      items: [
        { text: t('Introduction'), link: '/index.md' },
        { text: t('Getting Started'), link: '/getting-started.md' },
        { text: t('Migrate from tsup'), link: '/migrate-from-tsup.md' },
        { text: t('FAQ'), link: `/faq.md` },
      ],
    },
    {
      text: t('Options'),
      base: `${urlPrefix}/options`,
      items: [
        { text: t('Entry'), link: '/entry.md' },
        { text: t('Config File'), link: '/config-file.md' },
        { text: t('Declaration Files (dts)'), link: '/dts.md' },
        { text: t('Output Format'), link: '/output-format.md' },
        { text: t('Output Directory'), link: '/output-directory.md' },
        { text: t('Cleaning'), link: '/cleaning.md' },
        { text: t('Dependencies'), link: '/dependencies.md' },
        { text: t('Watch Mode'), link: '/watch-mode.md' },
        { text: t('Target'), link: '/target.md' },
        { text: t('Platform'), link: '/platform.md' },
        { text: t('Tree-shaking'), link: '/tree-shaking.md' },
        { text: t('Source Maps'), link: '/sourcemap.md' },
        { text: t('Minification'), link: '/minification.md' },
        { text: t('Silent Mode'), link: '/silent-mode.md' },
        { text: t('Shims'), link: '/shims.md' },
        { text: t('Package Exports'), link: '/package-exports.md' },
        { text: t('Unbundle'), link: '/unbundle.md' },
      ],
    },
    {
      text: t('Recipes'),
      base: `${urlPrefix}/recipes`,
      items: [
        { text: t('Vue Support'), link: '/vue-support.md' },
        { text: t('React Support'), link: '/react-support.md' },
      ],
    },
    {
      text: t('Advanced'),
      base: `${urlPrefix}/advanced`,
      items: [
        { text: t('Plugins'), link: '/plugins.md' },
        { text: t('Hooks'), link: '/hooks.md' },
        { text: t('Rolldown Options'), link: '/rolldown-options.md' },
        { text: t('Programmatic Usage'), link: '/programmatic-usage.md' },
        { text: t('Benchmark'), link: '/benchmark.md' },
      ],
    },
    {
      text: t('API Reference'),
      base: `${urlPrefix}/reference`,
      items: [
        { text: t('Command Line Interface'), link: '/cli.md' },
        {
          text: t('Config Options'),
          link: '/api/Interface.Options.md',
        },
        {
          text: t('Type Definitions'),
          items: typedocSidebar
            .flatMap((i) => i.items!)
            .filter((i) => i.text !== 'Options'),
          collapsed: true,
        },
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
      // { icon: 'jsr', link: 'https://jsr.io/@sxzz/tsdown' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present VoidZero Inc. & Contributors',
    },
  }

  if (lang === 'zh-CN') {
    Object.assign(themeConfig, {
      outline: {
        label: '页面导航',
        level: 'deep',
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
