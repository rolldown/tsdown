---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'tsdown'
  text: 优雅的<br>库打包工具
  tagline: 由 Rolldown 强力驱动
  image:
    src: /tsdown.svg
    alt: tsdown
  actions:
    - text: 什么是 tsdown？
      openVideoModal: true
    - theme: brand
      text: 开始使用
      link: /zh-CN/guide/
    - theme: alt
      text: API 参考
      link: /zh-CN/reference/api/Interface.Options.md

features:
  - icon: 🚀
    title: 极速构建
    details: 基于 Oxc 和 Rolldown 构建和生成声明文件（dts），速度极快！

  - icon: ♻️
    title: 强大的生态系统
    details: 支持 Rollup、Rolldown、unplugin 插件以及部分 Vite 插件。

  - icon: ️🛠️
    title: 简单易用
    details: tsdown 预配置了您开始所需的一切，让您专注于编写代码。

  - icon: 🔄
    title: 无缝迁移
    details: 兼容 tsup 的主要选项和功能，确保平滑过渡。
---
