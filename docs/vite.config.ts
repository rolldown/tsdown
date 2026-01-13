import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import {
  groupIconVitePlugin,
  localIconLoader,
} from 'vitepress-plugin-group-icons'
import llmstxt from 'vitepress-plugin-llms'
import pkg from '../package.json' with { type: 'json' }

export default defineConfig({
  plugins: [
    UnoCSS(),
    groupIconVitePlugin({
      customIcon: {
        tsdown: localIconLoader(import.meta.url, 'public/tsdown.svg'),
      },
    }),
    llmstxt({
      ignoreFiles: ['index.md', 'README.md', 'zh-CN/**/*'],
      description: pkg.description,
      details: '',
    }),
  ],
})
