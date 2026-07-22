<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
}>()

const data = ref<string>()

onMounted(async () => {
  data.value = await fetch(props.src).then((res) => res.text())
})
</script>

<template>
  <div v-if="data" v-html="data" />
  <img v-else :src :alt />
</template>
