# Svelte 支持

`tsdown` 通过集成 [`rollup-plugin-svelte`](https://github.com/sveltejs/rollup-plugin-svelte) 来支持构建 Svelte 组件库。该方案会编译 `.svelte` 组件，并与您的 TypeScript 源码一同打包。

## 快速上手

最快的入门方式是使用 Svelte 组件起步模板。该项目已为 Svelte 库开发预先配置好。

```bash
npx create-tsdown@latest -t svelte
```

## 最简示例

为 Svelte 库配置 `tsdown` 可使用如下 `tsdown.config.ts`：

```ts [tsdown.config.ts]
import svelte from 'rollup-plugin-svelte'
import { sveltePreprocess } from 'svelte-preprocess'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  plugins: [svelte({ preprocess: sveltePreprocess() })],
})
```

安装所需依赖：

::: code-group

```sh [npm]
npm install -D rollup-plugin-svelte svelte svelte-preprocess
```

```sh [pnpm]
pnpm add -D rollup-plugin-svelte svelte svelte-preprocess
```

```sh [yarn]
yarn add -D rollup-plugin-svelte svelte svelte-preprocess
```

```sh [bun]
bun add -D rollup-plugin-svelte svelte svelte-preprocess
```

:::

## 工作原理

- **`rollup-plugin-svelte`** 会编译 `.svelte` 单文件组件。
- **`tsdown`** 会将编译后的产物与您的 TypeScript 源码一同打包。

::: warning

为 Svelte 组件生成 `.d.ts` 通常需要集成 `svelte2tsx`。推荐使用 Svelte 专用模板，其中包含基于 `svelte2tsx` 的声明文件生成步骤，在打包后输出声明文件。

:::
