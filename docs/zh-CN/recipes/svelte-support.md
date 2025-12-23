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

:::info

为 Svelte 组件生成 `.d.ts` 通常需要集成 [`svelte2tsx`](https://www.npmjs.com/package/svelte2tsx)。推荐使用 Svelte 专用模板，其中包含基于 `svelte2tsx` 的声明文件生成步骤，在打包后输出声明文件。

:::

## 分发建议

综合实践与官方建议（参见 SvelteKit 文档「[Packaging](https://svelte.dev/docs/kit/packaging)」），不推荐将 Svelte 组件库预编译为 JS 分发。推荐直接分发 `.svelte` 源码，由使用者的 Svelte 工具链（如 Vite + `@sveltejs/vite-plugin-svelte`）在其项目内编译。

不推荐“编译为 JS 后分发”的主要原因：

- 版本兼容性：预编译 JS 绑定到特定的编译器与 `svelte/internal` 版本，和使用者项目版本不一致时容易引发运行时或 SSR/Hydration 问题。
- SSR/Hydration 一致性：库侧的编译选项（`generate`、`hydratable`、`dev` 等）若与应用侧不一致，易出现复水不匹配。
- 工具链优化与体验：源码形态能获得更好的 HMR、警告定位、样式处理与摇树优化；纯 JS 产物可能会丢失这些能力。
- 维护成本：Svelte 升级时，不需要频繁重发“已锁死编译器版本”的 JS 产物。

何时可以考虑 JS 分发（例外）：

- 需要提供非 Svelte 环境可直接使用的组件（例如编译为 `customElement` 的 Web Component）。
- 通过 CDN 直接加载、无构建流程的场景。

更多配置细节（如 `exports`、`types`、`files`、`sideEffects`、子路径导出与类型解析、声明映射等），请直接参考官方文档。

::: tip
tsdown 使用要点：
- 在 `tsdown` 中将 `svelte`/`svelte/*` 标记为 external，并在 `peerDependencies` 中声明 `svelte`。
- 使用 `rollup-plugin-svelte` 做预处理与打包整合，保持 `.svelte` 以源码形态分发。
- 配合 `svelte2tsx` 生成 `.d.ts`，并与 `exports` 子路径导出保持一致。
:::
