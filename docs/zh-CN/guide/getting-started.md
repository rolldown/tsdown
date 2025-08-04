# 快速上手

:::warning 🚧 测试版软件
[Rolldown](https://rolldown.rs) 当前处于测试阶段。虽然它已经可以满足大多数生产环境的使用需求，但仍可能存在一些 bug 或不完善之处。
:::

## 安装

有多种方式可以开始使用 `tsdown`：

- [手动安装](#manual-installation)：将其作为开发依赖添加到您的项目中。
- 使用 [起步模板](#starter-templates)：快速搭建新项目。
- 通过 [StackBlitz 在线体验](#try-online)。

### 手动安装 {#manual-installation}

使用您喜欢的包管理器将 `tsdown` 安装为开发依赖：

::: code-group

```sh [npm]
npm install -D tsdown
```

```sh [pnpm]
pnpm add -D tsdown
```

```sh [yarn]
yarn add -D tsdown
```

```sh [bun]
bun add -D tsdown
```

:::

Optionally, if you're not using [`isolatedDeclarations`](https://www.typescriptlang.org/tsconfig/#isolatedDeclarations), you should also install TypeScript as a development dependency:

::: code-group

```sh [npm]
npm install -D typescript
```

```sh [pnpm]
pnpm add -D typescript
```

```sh [yarn]
yarn add -D typescript
```

```sh [bun]
bun add -D typescript
```

:::

:::tip 兼容性说明
`tsdown` 需要 Node.js 20.19 或更高版本。请确保您的开发环境满足此要求后再进行安装。虽然 `tsdown` 主要在 Node.js 下测试，但对 Deno 和 Bun 的支持仍为实验性，可能无法正常工作。
:::

### 起步模板 {#starter-templates}

为了更快速地开始，您可以使用 [create-tsdown](https://github.com/gugustinette/create-tsdown) CLI，它提供了一系列起步模板，适用于构建纯 TypeScript 库以及如 React、Vue 等前端库。

::: code-group

```sh [npm]
npm create tsdown@latest
```

```sh [pnpm]
pnpm create tsdown@latest
```

```sh [yarn]
yarn create tsdown@latest
```

```sh [bun]
bun create tsdown@latest
```

:::

这些模板包含了可直接使用的配置和构建、测试、代码规范等最佳实践。

### 在线体验 {#try-online}

您可以通过 StackBlitz 在浏览器中直接体验 tsdown：

[![tsdown-starter-stackblitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/rolldown/tsdown-starter-stackblitz)

该模板已为 tsdown 预先配置，无需本地环境即可快速试用和上手。

## 使用 CLI

要验证 `tsdown` 是否正确安装，请在项目目录中运行以下命令：

```sh
./node_modules/.bin/tsdown --version
```

您还可以通过以下命令查看可用的 CLI 选项和示例：

```sh
./node_modules/.bin/tsdown --help
```

### 创建您的第一个打包

首先，创建两个源 TypeScript 文件：

```ts [src/index.ts]
import { hello } from './hello.ts'

hello()
```

```ts [src/hello.ts]
export function hello() {
  console.log('Hello tsdown!')
}
```

接下来，初始化 `tsdown` 配置文件：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src'],
})
```

现在，运行以下命令来打包您的代码：

```sh
./node_modules/.bin/tsdown
```

您应该会看到打包后的输出文件写入到 `dist/index.mjs`。为了验证它是否正常工作，运行输出文件：

```sh
node dist/index.mjs
```

您应该会在控制台中看到消息 `Hello tsdown!`。

### 在 npm 脚本中使用 CLI

为了简化命令，您可以将其添加到 `package.json` 的脚本中：

```json{5} [package.json]
{
  "name": "my-tsdown-project",
  "type": "module",
  "scripts": {
    "build": "tsdown"
  },
  "devDependencies": {
    "tsdown": "^0.9.0"
  }
}
```

现在，您可以通过以下命令构建项目：

```sh
npm run build
```

## 使用配置文件

虽然可以直接使用 CLI，但对于更复杂的项目，推荐使用配置文件。这可以让您以集中且可复用的方式定义和管理构建设置。

有关更多详细信息，请参阅 [配置文件](../options/config-file.md) 文档。

## 使用插件

`tsdown` 支持通过插件扩展其功能。您可以无缝使用 Rolldown 插件、Unplugin 插件以及大多数 Rollup 插件。要使用插件，请将它们添加到配置文件的 `plugins` 数组中。例如：

```ts [tsdown.config.ts]
import SomePlugin from 'some-plugin'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [SomePlugin()],
})
```

有关更多详细信息，请参阅 [插件](../advanced/plugins.md) 文档。

## 使用监听模式

您可以启用监听模式，在文件更改时自动重新构建项目。这在开发过程中非常有用，可以简化您的工作流程。使用 `--watch`（或 `-w`）选项：

```bash
tsdown --watch
```

有关更多详细信息，请参阅 [监听模式](../options/watch-mode.md) 文档。
