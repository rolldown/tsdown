# Vue 支持

`tsdown` 通过与 [`unplugin-vue`](https://github.com/unplugin/unplugin-vue) 和 [`rolldown-plugin-dts`](https://github.com/sxzz/rolldown-plugin-dts) 的无缝集成，为构建 Vue 组件库提供了一流支持。这一方案让您能够使用现代 TypeScript 工具链打包 Vue 组件并生成类型声明。

## 快速上手

最快的入门方式是使用 Vue 组件起步模板。该项目已为 Vue 库开发预先配置好，让您可以立即专注于组件开发。

```bash
npx create-tsdown@latest -t vue
```

## 最简示例

要为 Vue 组件库配置 `tsdown`，可在 `tsdown.config.ts` 中使用如下设置：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
})
```

安装所需依赖：

```bash
npm install -D unplugin-vue vue-tsc
```

## 工作原理

- **`unplugin-vue`** 会将 `.vue` 单文件组件编译为 JavaScript 并提取 CSS，使其可以直接打包。
- **`rolldown-plugin-dts`**（配合 `vue: true`）和 **`vue-tsc`** 协同工作，为您的 Vue 组件生成准确的 TypeScript 声明文件，确保库的使用者获得完整的类型支持。

> [!TIP]
> 建议将 `platform` 设置为 `'neutral'`，以最大化兼容性，方便您的库同时用于浏览器和 Node.js 环境。
