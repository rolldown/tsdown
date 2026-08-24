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

如果需要使用经典 JSX 转换方式，可在配置文件中设置 Rolldown 的 [`transform.jsx`](https://rolldown.rs/reference/InputOptions.transform#jsx) 选项：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    transform: {
      jsx: 'react', // 使用经典 JSX 转换
    },
  },
})
```

:::

## 启用 React Compiler

React Compiler 是一种创新的构建期优化工具，可自动记忆化（memoize）React 组件与 Hook。React 推荐库作者使用 React Compiler 预编译代码以获得更佳性能。

在 `tsdown` 中有两种启用方式：稳定的 Babel 集成方案，以及新的实验性原生 Oxc 支持。

### Babel 预设

React Compiler 以 Babel 插件的形式发布。`@vitejs/plugin-react` 导出的 `reactCompilerPreset` 帮助函数会为您配置好 `babel-plugin-react-compiler`，再与 `@rolldown/plugin-babel` 搭配即可在 `tsdown` 中使用：

```bash
pnpm add -D @rolldown/plugin-babel @vitejs/plugin-react babel-plugin-react-compiler
```

```ts [tsdown.config.ts]
import pluginBabel from '@rolldown/plugin-babel'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    pluginBabel({
      presets: [reactCompilerPreset()],
    }),
  ],
})
```

### 原生 Oxc 支持（实验性）

自 [`@vitejs/plugin-react` 6.1.0](https://github.com/vitejs/vite-plugin-react/releases/tag/plugin-react%406.1.0) 起，React Compiler 也可以通过独立的 [`oxc-transform-react`](https://oxc.rs/docs/guide/usage/transformer/react-compiler.html) 包以原生形式使用，该包内置了 React Compiler 的 Rust 移植版。安装后启用实验性的 `compiler` 选项即可：

```bash
pnpm add -D @vitejs/plugin-react oxc-transform-react
```

```ts [tsdown.config.ts]
import react from '@vitejs/plugin-react'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
  plugins: [
    react({
      compiler: true,
      // 仅在 dts: true 时需要：防止插件转换生成的 .d.ts 文件
      exclude: [/node_modules/, /\.d\.ts$/],
    }),
  ],
})
```

`exclude` 仅在 `dts: true` 时需要——插件的默认过滤器同样会匹配生成的声明文件，从而破坏构建。未启用 `dts` 时，`react({ compiler: true })` 即可。

编译器在任何其他转换之前对原始源码运行，默认以 React 19 为目标。可通过 `compiler` 选项指定其他版本：

```ts
react({
  compiler: {
    target: '18', // '17' | '18' | '19'
  },
})
```

React 19 的编译器运行时随 `react` 包一起提供；目标为 17 和 18 时需要安装 `react-compiler-runtime` 包。文件名包含 `node_modules` 的文件默认会被跳过——可在 `compiler` 选项中通过 `sources` 白名单显式接入依赖。

::: warning

原生 React Compiler 支持目前为实验性，处于积极开发中。选项和行为可能发生变化，在生产环境使用前请审查生成的输出。

:::
