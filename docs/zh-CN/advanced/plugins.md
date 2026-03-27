# 插件

`tsdown` 以 [Rolldown](https://rolldown.rs) 作为核心引擎，因此可以无缝支持 Rolldown 插件。插件是一种强大的扩展方式，可以自定义打包流程，实现代码转换、资源处理等功能。

## 支持的插件生态

### Rolldown 插件

由于 `tsdown` 基于 Rolldown 构建，因此支持所有 Rolldown 插件。您可以使用任何为 Rolldown 设计的插件来增强构建流程。

### Unplugin

[Unplugin](https://unplugin.unjs.io/) 是一个现代化的插件框架，支持包括 Rolldown 在内的多种打包器。大多数 Unplugin 插件（通常以 `unplugin-` 为前缀命名）都可以与 `tsdown` 无缝配合使用。

### Rollup 插件

Rolldown 与 Rollup 的插件 API 高度兼容，因此 `tsdown` 可以直接使用大多数 Rollup 插件。这让您能够利用 Rollup 生态中丰富的现有插件资源。

> [!NOTE] 类型兼容性
> 由于 Rollup 和 Rolldown 的插件 API 并非 100% 兼容，Rollup 插件有时可能会导致 TypeScript 类型报错。如果您在使用 Rollup 插件时遇到类型错误，可以通过 `// @ts-expect-error` 或将插件强制转换为 `any` 来忽略这些错误：
>
> ```ts
> import SomeRollupPlugin from 'some-rollup-plugin'
> export default defineConfig({
>   plugins: [SomeRollupPlugin() as any],
> })
> ```

### Vite 插件

如果 Vite 插件不依赖于 Vite 特定的内部 API 或行为，它们可能可以与 `tsdown` 一起使用。但如果插件严重依赖 Vite 内部机制，则可能不兼容。我们计划未来进一步完善对 Vite 插件的支持。

> [!NOTE] 类型兼容性
> 同样，Vite 插件也可能因 API 差异导致类型错误。如有需要，您可以使用 `// @ts-expect-error` 或 `as any` 来屏蔽这些类型报错。

## 如何使用插件

要在 `tsdown` 中使用插件，需将其添加到配置文件的 `plugins` 数组中。插件**不能**通过 CLI 添加。

以下是插件使用示例：

```ts [tsdown.config.ts]
import SomePlugin from 'some-plugin'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [SomePlugin()],
})
```

具体插件的用法请参考插件自身的文档。

## 编写自定义插件

如果您想为 `tsdown` 创建自定义插件，可以参考 Rolldown 的插件开发指南。Rolldown 的插件 API 高度灵活，与 Rollup 的 API 类似，便于快速上手。

详细说明请参阅 [Rolldown 插件开发指南](https://rolldown.rs/apis/plugin-api)。

> [!TIP]
> 插件是扩展 `tsdown` 功能的绝佳方式。无论是使用现有插件还是自定义插件，都可以让您的打包流程更好地适应项目需求。
