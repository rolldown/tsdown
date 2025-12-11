# React 支持

`tsdown` 为构建 React 组件库提供一流支持。由于 [Rolldown](https://rolldown.rs/) 原生支持打包 JSX/TSX 文件，开始使用时无需任何额外插件。

## 快速上手

最快的入门方式是使用 React 组件起步模板。该项目已为 React 库开发预先配置好，让您可以立即专注于组件开发。

```bash
npx create-tsdown@latest -t react
```

如果需要使用 React Compiler，可以使用专用模板快速搭建项目：

```bash
npx create-tsdown@latest -t react-compiler
```

## 最简示例

为 React 组件库配置 `tsdown` 时，直接使用标准的 `tsdown.config.ts` 即可：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
})
```

创建一个典型的 React 组件：

```tsx [MyButton.tsx]
import React from 'react'

interface MyButtonProps {
  type?: 'primary'
}

export const MyButton: React.FC<MyButtonProps> = ({ type }) => {
  return <button className="my-button">my button: type {type}</button>
}
```

并在入口文件中导出它：

```ts [index.ts]
export { MyButton } from './MyButton'
```

::: warning

在 `tsdown` 中有两种 JSX/TSX 转换方式：

- **classic（经典）**
- **automatic（自动，默认）**

如果需要使用经典 JSX 转换方式，可在配置文件中设置 Rolldown 的 [`inputOptions.jsx`](https://rolldown.rs/reference/config-options#jsx) 选项：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    transform: {
      jsx: 'react', // 使用经典 JSX 转换
    }
  },
})
```

:::

## 启用 React Compiler

React Compiler 是一种创新的构建期优化工具，可自动优化 React 应用。React 推荐库作者使用 React Compiler 预编译代码以获得更佳性能。

目前，React Compiler 仅作为 Babel 插件提供。您可以像上文所示脚手架 `react-compiler` 模板，或手动集成：

```bash
pnpm add -D @rollup/plugin-babel babel-plugin-react-compiler
```

```ts [tsdown.config.ts]
import pluginBabel from '@rollup/plugin-babel'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    pluginBabel({
      babelHelpers: 'bundled',
      parserOpts: {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      },
      plugins: ['babel-plugin-react-compiler'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
  ],
})
```
