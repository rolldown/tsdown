<script setup lang="ts">
import { useData } from 'vitepress'
import { onMounted, ref } from 'vue'

const { lang } = useData()

const sponsors = ref<string>()

onMounted(async () => {
  sponsors.value = await fetch(
    'https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.wide.svg',
  ).then((res) => res.text())
})
</script>

<template>
  <div flex="~ col" items-center justify-center>
    <div mt20 flex="~ col" items-center gap8>
      <h2 v-if="lang === 'en'" class="voidzero-title">Brought to you by</h2>
      <a
        class="voidzero"
        href="https://voidzero.dev/"
        target="_blank"
        title="voidzero.dev"
        alt="VoidZero"
        block
        h-75px
        w-300px
      />
      <h2 v-if="lang === 'zh-CN'" class="voidzero-title">
        由 VoidZero 隆重推出
      </h2>
    </div>

    <div mt12>
      <div v-if="sponsors" v-html="sponsors" />
      <img
        v-else
        src="https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.wide.svg"
      />
    </div>
  </div>
</template>

<style scoped>
.voidzero-title {
  line-height: 32px;
  font-size: 24px;
  font-weight: 600;
}

.voidzero {
  background: url(https://voidzero.dev/logo.svg) no-repeat center;
  background-size: contain;
}

.dark .voidzero {
  background-image: url(https://voidzero.dev/logo-white.svg);
}

:deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
