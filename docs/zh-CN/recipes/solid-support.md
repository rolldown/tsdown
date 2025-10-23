# Solid 支持

`tsdown` 通过集成 [`rolldown-plugin-solid`](https://github.com/g-mero/rolldown-plugin-solid) 或 [`unplugin-solid`](https://github.com/unplugin/unplugin-solid)，简化了 Solid 组件库的开发流程。该集成让您能够打包 Solid 组件，并使用现代 TypeScript 工具自动生成类型声明。

## 快速上手

最快的入门方式是使用 Solid 组件起步模板。该项目已为 Solid 库开发预先配置好，让您可以立即专注于组件开发。

```bash
npx create-tsdown@latest -t solid
```

## 最小示例

要为 Solid 组件库配置 `tsdown`，可在 `tsdown.config.ts` 中使用如下设置：

```ts [tsdown.config.ts]
import solid from 'rolldown-plugin-solid' // 或使用 'unplugin-solid/rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
  plugins: [solid()],
})
```

创建一个典型的 Solid 组件：

```tsx [MyButton.tsx]
import type { Component } from 'solid-js'

interface MyButtonProps {
  type?: 'primary'
}

export const MyButton: Component<MyButtonProps> = ({ type }) => {
  return (
    <button class="my-button">
      my button: type
      {type}
    </button>
  )
}
```

并在入口文件中导出它：

```ts [index.ts]
export { MyButton } from './MyButton'
```

安装所需依赖：

::: code-group

```sh [npm]
npm install -D rolldown-plugin-solid
```

```sh [pnpm]
pnpm add -D rolldown-plugin-solid
```

```sh [yarn]
yarn add -D rolldown-plugin-solid
```

```sh [bun]
bun add -D rolldown-plugin-solid
```

:::

或者，如果您更喜欢使用 `unplugin-solid`：

::: code-group

```sh [npm]
npm install -D unplugin-solid
```

```sh [pnpm]
pnpm add -D unplugin-solid
```

```sh [yarn]
yarn add -D unplugin-solid
```

```sh [bun]
bun add -D unplugin-solid
```

:::
