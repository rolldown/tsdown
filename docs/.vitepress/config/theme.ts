import { existsSync } from 'node:fs'
import module from 'node:module'
import path from 'node:path'
import { createTranslate } from '../i18n/utils.ts'
import type { DefaultTheme, HeadConfig, LocaleConfig } from 'vitepress'

const require = module.createRequire(import.meta.url)

function getTypedocSidebar() {
  const filepath = path.resolve(
    import.meta.dirname,
    '../../reference/api/typedoc-sidebar.json',
  )
  if (!existsSync(filepath)) return []

  try {
    return require(filepath) as DefaultTheme.SidebarItem[]
  } catch (error) {
    console.error('Failed to load typedoc sidebar:', error)
    return []
  }
}

const typedocSidebar = getTypedocSidebar()
const rolldownSidebar: { items: DefaultTheme.SidebarItem[]; base: string } = {
  items: typedocSidebar[0]
    .items![0].items!.filter(
      (item) => item.text === 'Interfaces' || item.text === 'Type Aliases',
    )!
    .flatMap((item) => item.items!)
    .toSorted((a, b) => a.text!.localeCompare(b.text!)),
  base: '/reference',
}

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
      link: `${urlPrefix}/reference/api/Interface.UserConfig.md`,
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
        { text: t('Log Level'), link: '/log-level.md' },
        { text: t('Shims'), link: '/shims.md' },
        { text: t('Package Exports'), link: '/package-exports.md' },
        { text: t('Unbundle'), link: '/unbundle.md' },
        { text: t('CJS Default Export'), link: '/cjs-default.md' },
        { text: t('CSS'), link: '/css.md' },
      ],
    },
    {
      text: t('Recipes'),
      base: `${urlPrefix}/recipes`,
      items: [
        { text: t('Vue Support'), link: '/vue-support.md' },
        { text: t('React Support'), link: '/react-support.md' },
        { text: t('Solid Support'), link: '/solid-support.md' },
        { text: t('Svelte Support'), link: '/svelte-support.md' },
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
          link: '/api/Interface.UserConfig.md',
        },
        {
          text: t('Type Definitions'),
          items: [
            { text: 'Rolldown', link: '/api/rolldown.md' },
            ...typedocSidebar
              .flatMap((i) => i.items!)
              .filter((i) => i.text !== 'Options' && i.text !== 'rolldown')
              .toSorted((a, b) => a.text!.localeCompare(b.text!)),
          ],
          collapsed: true,
        },
      ],
    },
  ]

  const themeConfig: DefaultTheme.Config = {
    logo: { src: '/tsdown.svg', width: 24, height: 24 },
    nav,
    sidebar: {
      '/reference/api/rolldown': rolldownSidebar,
      '/': sidebar,
    },
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
      lastUpdated: {
        text: '最后更新于',
        formatOptions: {
          forceLocale: true,
          dateStyle: 'short',
          timeStyle: 'short',
        },
      },
      darkModeSwitchLabel: '外观',
      lightModeSwitchTitle: '切换到浅色模式',
      darkModeSwitchTitle: '切换到深色模式',
      sidebarMenuLabel: '目录',
      returnToTopLabel: '返回顶部',
      langMenuLabel: '切换语言',
      skipToContentLabel: '跳到正文',
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
