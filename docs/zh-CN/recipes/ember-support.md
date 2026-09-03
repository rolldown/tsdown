# Ember 支持

`tsdown` 可借助 [`@nullvoxpopuli/ember-rolldown`](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown) 构建 Ember v2 addon（库）。该元插件会将 `.gts` 和 `.gjs` 文件（包括其中的 `<template>` 标签）编译为可发布的产物。只需调用一次 `ember()`，即可取代通常所需的 `@embroider/*` 外部化配置、`content-tag` 预处理和 Babel 集成。

> [!NOTE]
> 该插件目前仅面向 Ember 库（v2 addon）；尚未测试 Ember 应用的构建。

## 最简示例

在 `tsdown.config.ts` 中按如下方式配置 Ember 库：

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

构建后会在 `dist/` 中生成与各入口对应的 `.js` 和 `.d.ts` 文件，并为 JavaScript 产物生成源映射。Ember 虚拟包（如 `@ember/component` 和 `@glimmer/tracking`）以及列在 `dependencies` 或 `peerDependencies` 中的包不会被打包，而由使用该库的应用解析。

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
> `@nullvoxpopuli/ember-rolldown` 需要 Node.js 24+。由于该包直接发布 TypeScript 源码，如需对使用该包的项目进行类型检查，还需使用 TypeScript 6+，并在 `lib` 中包含 `es2025`（例如 `esnext`）。

## 声明文件

`.gts` 和 `.gjs` 这类模板标签模块只存在于打包器的模块图中，因此必须使用 [`isolatedDeclarations`](../options/dts.md#启用-isolateddeclarations) 生成声明文件。构建所用的 `tsconfig` 必须启用该选项，否则 `ember()` 会报错：

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true,
  },
}
```

`isolatedDeclarations` 要求为导出的 API 提供足够的类型标注，使工具无需跨文件类型推断即可生成声明文件。例如，上文的组件使用了显式的 `TOC<BadgeSignature>` 类型注解。如果包内还包含不应受此约束的仅供开发的代码（如演示应用或包内测试），可将 `tsdown` 的 `tsconfig` 选项指向仅用于发布的配置文件：

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['./src/index.ts'],
  tsconfig: './tsconfig.publish.json',
  plugins: [ember()],
})
```

## 工作原理

`ember()` 返回一组 Rolldown 插件，它们会：

- 将 `dependencies` 和 `peerDependencies` 中的包以及 Ember 虚拟包保留为外部依赖，由使用该库的应用解析。
- 使用 [`content-tag`](https://github.com/embroider-build/content-tag) 预处理 `<template>` 标签，并将 `.gts`/`.gjs` 映射为 `.ts`/`.js`，使 Rolldown 能够处理它们。
- 仅对包含模板标签、装饰器等确需 Babel 处理的文件运行 Babel；其他文件仍使用 Rolldown 的快速原生转换。
- 检查构建所用的 `tsconfig` 是否启用了 `isolatedDeclarations`。

Babel 配置可省略。未提供时，`ember()` 会使用内置默认配置处理模板、装饰器和 TypeScript；提供后则改用自定义配置。

## CSS

若组件导入了与其同目录的 CSS（`import './badge.css'`），项目需安装 [`@tsdown/css`](../options/css.md)。`tsdown` 会自动检测该包，并将导入的样式表合并到 `dist/` 中的一个 CSS 文件。设置 `css: { inject: true }` 后，生成的 JavaScript 会保留指向该 CSS 文件的导入语句，使用该库的应用便可通过模块图加载样式。

如需了解用于支持经典名称解析的 `app re-exports`、`ember-scoped-css` 集成和发布专用 Babel 配置等高级用法，请参阅[插件文档](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown#readme)。
