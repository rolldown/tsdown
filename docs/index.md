---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'tsdown'
  text: 'Zero-config<br>Library bundler'
  tagline: based on Rolldown
  image:
    src: /tsdown.svg
    alt: tsdown
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Reference
      link: /reference/config-options.md

features:
  - title: Speed of Rust
    details: |
      tsdown is based on Rolldown, which handles tens of thousands of modules without breaking a sweat
  - title: Easy to use
    details: |
      tsdown preconfigures everything you need to get started, so you can focus on writing code
---

<h2 class="voidzero-lead">Brought to you by</h2>

<a class="voidzero" href="https://voidzero.dev/" target="_blank" title="voidzero.dev"></a>

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(90deg, #ff7e17, rgb(84, 218, 233));
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

.VPImage {
  height: 80%;
  width: 80%;
}
</style>
