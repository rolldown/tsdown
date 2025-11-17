# React 支持

`tsdown` 为构建 React 组件库提供了一流的支持。由于 [Rolldown](https://rolldown.rs/) 原生支持打包 JSX/TSX 文件，你无需任何额外的插件即可开始使用。

## 快速开始

最快的入门方式是使用 React 组件启动模板。这个启动项目已经为 React 库开发进行了预配置，因此你可以直接专注于构建组件。

```bash
npx create-tsdown@latest -t react
```

如果你计划使用 React Compiler，可以直接使用对应模板：

```bash
npx create-tsdown@latest -t react-compiler
```

## 最小示例

要为 React 库配置 `tsdown`，你只需使用标准的 `tsdown.config.ts`：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
})
```

创建你的典型 React 组件：

```tsx [MyButton.tsx]
import React from 'react'

interface MyButtonProps {
  type?: 'primary'
}

export const MyButton: React.FC<MyButtonProps> = ({ type }) => {
  return <button className="my-button">my button: type {type}</button>
}
```

然后在入口文件中导入它：

```ts [index.ts]
export { MyButton } from './MyButton'
```

::: warning

在 `tsdown` 中有两种转换 JSX/TSX 文件的方式：

- **经典模式（classic）**
- **自动模式（automatic）**（默认）

如果你需要使用经典 JSX 转换，可以在配置文件中配置 Rolldown 的 [`inputOptions.jsx`](https://rolldown.rs/reference/config-options#jsx) 选项：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    jsx: 'react', // 使用经典 JSX 转换
  },
})
```

:::

## 启用 React Compiler

React Compiler 是一个新的构建时工具，它可以自动优化你的 React 应用。React 官方建议库作者启用 React Compiler，在发布前预编译代码。

React Compiler 目前仅以 Babel 插件的形式提供。如果你计划使用 React Compiler，可以直接使用上面的 `react-compiler` 模板；或按需手动集成：

```bash
pnpm add -D @rollup/plugin-babel babel-plugin-react-compiler
```

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'
import pluginBabel from '@rollup/plugin-babel'

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
