<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'
import { useTranslate } from '../i18n/composable.ts'
import Marquee from './Marquee.vue'

const { isDark } = useData()
const t = useTranslate()

const users = computed(() => {
  const jsdelivrBase = 'https://cdn.jsdelivr.net/gh/'
  const voidzeroBase = `${jsdelivrBase}voidzero-dev/community-design-resources/brand-assets`

  const theme = isDark.value ? 'light' : 'dark'
  return [
    {
      name: 'VoidZero',
      logo: `${voidzeroBase}/voidzero/voidzero-logo-${theme}.svg`,
      url: 'https://voidzero.dev',
    },
    {
      name: 'Vite',
      logo: `${voidzeroBase}/vite/vite-logo-color-${theme}.svg`,
      url: 'https://vite.dev',
    },
    {
      name: 'Vitest',
      logo: `${voidzeroBase}/vitest/vitest-logo-color-${theme}.svg`,
      url: 'https://vitest.dev',
    },
    {
      name: 'Oxc',
      logo: `${voidzeroBase}/oxc/oxc-logo-color-${theme}.svg`,
      url: 'https://oxc.rs',
    },

    {
      name: 'Vercel',
      logo: 'i-logos:vercel',
      url: 'https://vercel.com',
    },
    {
      name: 'Cloudflare',
      logo: 'i-logos:cloudflare',
      url: 'https://cloudflare.com',
    },
    {
      name: 'Linear',
      logo: 'i-logos:linear',
      url: 'https://linear.app',
    },
    {
      name: 'Tencent',
      logo: `${jsdelivrBase}/lobehub/lobe-icons/packages/static-png/dark/tencent-brand-color.png`,
      url: 'https://www.tencent.com',
      class: 'h8',
    },
    {
      name: 'Binance',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Binance_logo.svg',
      url: 'https://www.binance.com',
      class: 'h9',
    },
    {
      name: 'Supabase',
      logo: 'i-logos:supabase',
      url: 'https://supabase.com',
    },
    {
      name: 'Sentry',
      logo: 'i-logos:sentry',
      url: 'https://sentry.io',
    },
    {
      name: 'Baidu',
      logo: `${jsdelivrBase}/lobehub/lobe-icons/packages/static-png/dark/baidu-brand-color.png`,
      url: 'https://www.baidu.com',
      class: 'h8 scale-120',
    },

    {
      name: 'Vue',
      logo: 'i-logos:vue',
      url: 'https://vuejs.org',
      class: 'text-3xl scale-120',
    },
    {
      name: 'Nuxt',
      logo: `https://nuxt.com/assets/design-kit/logo-green-${isDark.value ? 'white' : 'black'}.svg`,
      url: 'https://nuxt.com',
      class: 'h8',
    },
    {
      name: 'ESLint',
      logo: 'i-logos:eslint',
      url: 'https://eslint.org',
      class: 'text-3xl scale-130',
    },
    {
      name: 'Prettier',
      logo: 'i-logos:prettier',
      url: 'https://prettier.io',
      class: 'text-3xl scale-120',
    },
    {
      name: 'Slidev',
      logo: 'i-logos:slidev',
      url: 'https://sli.dev',
      class: 'text-3xl scale-120',
    },
    {
      name: 'Vue Macros',
      logo: 'https://vue-macros.dev/favicon.svg',
      url: 'https://vue-macros.dev',
      class: 'h10',
    },
    {
      name: 'Vue Vine',
      logo: 'https://vue-vine.dev/vine-logo.png',
      url: 'https://vue-vine.dev',
      class: 'h10 scale-150',
    },
  ]
})
</script>

<template>
  <!--
    Copied from https://github.com/privatenumber/tsx
    MIT License: https://github.com/privatenumber/tsx/blob/master/LICENSE
  -->
  <div flex flex-col items-center gap4>
    <a
      href="https://github.com/rolldown/tsdown/discussions/143"
      target="_blank"
      rel="noopener noreferrer"
    >
      <h3>{{ t('Who uses tsdown?') }}</h3>
    </a>

    <Marquee
      :velocity="40"
      class="dark-zebra-pattern"
      w-full
      rounded-xl
      py-6
      dark:bg-zinc:30
    >
      <div min-w-full flex items-center gap10 px>
        <a
          v-for="user of users"
          :key="user.name"
          :href="user.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            v-if="user.logo.startsWith('https://')"
            :src="user.logo"
            :alt="user.name"
            :class="user.class || 'h6'"
          />
          <div v-else :class="[user.logo, user.class || 'text-3xl']" />
        </a>
      </div>
    </Marquee>
  </div>
</template>

<style scoped>
.dark .dark-zebra-pattern {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgb(0 0 0/ 0.05) 10px,
    rgb(0 0 0/ 0.05) 20px
  );
}
</style>
