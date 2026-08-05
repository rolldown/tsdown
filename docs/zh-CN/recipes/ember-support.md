# Ember 支持

`tsdown` 通过集成 [`@nullvoxpopuli/ember-rolldown`](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown) 支持构建 Ember v2 addon（库）。这个元插件（meta-plugin）将 `.gts`/`.gjs` 及模板标签（`<template>`）源码编译为可发布的产物——只需一个 `ember()` 调用，即可取代原本由 `@embroider/*` 外部依赖处理、`content-tag` 预处理和 Babel 配置组成的一整套工具链。

> [!NOTE]
> 该插件目前仅面向 Ember 库（v2 addon）——尚未针对构建应用（app）进行测试。

## 最简示例

要为 Ember 库配置 `tsdown`，请在 `tsdown.config.ts` 中使用以下配置：

```ts [tsdown.config.ts]
import { ember } from '@nullvoxpopuli/ember-rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  plugins: [ember()],
})
```

创建一个典型的 Ember 组件：

```gts [src/components/badge.gts]
import type { TOC } from '@ember/component/template-only'

export interface BadgeSignature {
  Element: HTMLSpanElement
  Args: { label: string }
  Blocks: { default: [] }
}

export const Badge: TOC<BadgeSignature> = <template>
  <span class="badge" ...attributes>
    {{@label}}
    {{yield}}
  </span>
</template>
```

然后在入口文件中导出它：

```ts [src/index.ts]
export { Badge } from './components/badge.gts'
```

该配置会将您的入口构建为带有 sourcemap 的 `dist/*.js` 和 `dist/*.d.ts`，同时将 Ember 的虚拟包（如 `@ember/component`、`@glimmer/tracking`）以及您的 `dependencies` / `peerDependencies` 保持为外部依赖，由使用方应用解析。

安装所需依赖：

::: code-group

```sh [npm]
npm install -D @nullvoxpopuli/ember-rolldown
```

```sh [pnpm]
pnpm add -D @nullvoxpopuli/ember-rolldown
```

```sh [yarn]
yarn add -D @nullvoxpopuli/ember-rolldown
```

```sh [bun]
bun add -D @nullvoxpopuli/ember-rolldown
```

:::

> [!NOTE]
> `@nullvoxpopuli/ember-rolldown` 需要 Node.js 24+ 和 TypeScript 6。

## 声明文件

`.gts`/`.gjs`（模板标签）模块仅存在于打包器的模块图中，因此声明文件通过[隔离声明（isolated declarations）](../options/dts.md#启用-isolateddeclarations)生成——构建所使用的 tsconfig 必须启用该选项（否则 `ember()` 会报错）：

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true,
  },
}
```

这意味着每个导出的值都需要显式的类型注解，例如上文的 `TOC<BadgeSignature>`。如果您的包中还包含不应受此约束的仅供开发的代码（例如包内的演示应用或测试），可将 tsdown 的 `tsconfig` 选项指向仅用于发布的配置文件：

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['./src/index.ts'],
  tsconfig: './tsconfig.publish.json',
  plugins: [ember()],
})
```

## 工作原理

`ember()` 返回一组 Rolldown 插件，它们会：

- 将您的 `dependencies`、`peerDependencies` 以及 Ember 虚拟包保持为外部依赖，由使用方应用解析。
- 通过 [`content-tag`](https://github.com/embroider-build/content-tag) 预处理 `<template>` 标签，并映射 `.gts`/`.gjs` 模块，使 Rolldown 能够识别它们。
- 仅对真正需要的文件（模板标签、装饰器）运行 Babel；其余文件仍使用 Rolldown 快速的原生转换。
- 校验 tsconfig 是否启用了 `isolatedDeclarations`。

Babel 配置是可选的：没有配置时，模板、装饰器和 TypeScript 由内置默认值处理；有配置时，则使用您的配置。

## CSS

导入同目录 CSS 的组件（`import './badge.css'`）需要安装 [`@tsdown/css`](../options/css.md)；tsdown 会自动检测并将导入的样式表打包为 `dist/` 中的单个 CSS 文件。设置 `css: { inject: true }` 可在产物中保留 CSS 导入语句，使使用方应用通过模块图加载样式。

关于更多高级主题——用于经典（基于名称）解析的应用再导出（app re-exports）、`ember-scoped-css` 集成以及发布专用的 Babel 配置——请参阅[插件文档](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown#readme)。
