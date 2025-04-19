---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'tsdown'
  text: '由 RollDown 赋能的更快打包工具。'
  tagline: '基于 Rolldown'
  image:
    src: /tsdown.svg
    alt: Rolldown
  actions:
    - theme: brand
      text: 快速开始
      link: /zh-CN/guide/
    - theme: alt
      text: 指引
      link: /zh-CN/reference/config-options.md

features:
  - icon: 🚀
    title: 极速构建
    details: 基于 Oxc 和 Rolldown 构建与生成 `.d.ts`，速度快得惊人！
  - icon: ♻️
    title: 强大生态
    details: 支持 Rollup / Rolldown / unplugin 插件，兼容部分 Vite 插件。
  - icon: 📦
    title: 开箱即用
    details: 可复用来自 Vite 或 Vitest 的配置，无需额外设置。
  - icon: 🔄
    title: 平滑迁移
    details: 兼容 tsup 的主要配置与特性，迁移无缝顺畅。
---

<h2 class="voidzero-lead">Brought to you by</h2>

<a class="voidzero" href="https://voidzero.dev/" target="_blank" title="voidzero.dev"></a>

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(90deg, #FF5D13, #F0DB4F);
}

h2.voidzero-lead {
  text-align: center;
  padding-top: 60px;
}

.voidzero {
  display: block;
  width: 300px;
  height: 74px;
  margin: 30px auto -20px;
  background-image: url(https://voidzero.dev/logo.svg);
  background-repeat: no-repeat;
  background-size: auto 74px;
  background-position: center;
}

.dark .voidzero {
  background-image: url(https://voidzero.dev/logo-white.svg);
}
</style>
