---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
theme: dark

hero:
  name: 'tsdown'
  text: 'The Elegant <br> Library Bundler'
  tagline: Powered by Rolldown
  image:
    src: /tsdown.svg
    alt: tsdown
  actions:
    # - text: What is tsdown?
    #   openVideoModal: true
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: API Reference
      link: /reference/api/Interface.UserConfig

features:
  - icon: 🚀
    title: Blazing fast
    details: |
      Build and generate declaration files powered by Oxc and Rolldown, incredibly fast!

  - icon: ♻️
    title: Powerful ecosystem
    details: Support Rollup, Rolldown, unplugin plugins, and some Vite plugins.

  - icon: ️🛠️
    title: Easy to use
    details: |
      tsdown preconfigures everything you need to get started, so you can focus on writing code.

  - icon: 🔄
    title: Seamless migration
    details: |
      Compatible with tsup's main options and features, ensuring a smooth transition.
---

<script setup>
import Home from './.vitepress/theme/Home.vue'
</script>

<Home />
