# 声明文件 (dts)

声明文件（`.d.ts`）是 TypeScript 库的重要组成部分，它为您的库的使用者提供类型定义，使其能够享受 TypeScript 的类型检查和智能提示。

`tsdown` 让生成和打包声明文件变得简单，确保为您的用户带来无缝的开发体验。

> [!NOTE]
> 您必须在项目中安装 `typescript`，声明文件的生成才能正常工作。

## tsdown 中 dts 的工作原理

`tsdown` 内部使用 [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts) 来生成和打包 `.d.ts` 文件。该插件专为高效处理声明文件生成而设计，并与 `tsdown` 无缝集成。

如果您在 `.d.ts` 生成过程中遇到任何问题，请直接在 [rolldown-plugin-dts 仓库](https://github.com/sxzz/rolldown-plugin-dts/issues)中反馈。

## 启用 dts 生成

如果您的 `package.json` 中包含 `types` 或 `typings` 字段，`tsdown` 会**默认启用**声明文件生成。

您也可以通过 CLI 的 `--dts` 选项或在配置文件中设置 `dts: true` 来显式启用 `.d.ts` 文件生成。

### CLI

```bash
tsdown --dts
```

### 配置文件

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
})
```

## 声明文件映射（Declaration Map）

声明文件映射允许 `.d.ts` 文件映射回其原始的 `.ts` 源文件，这在 monorepo 场景下对于导航和调试尤为有用。详细说明请参阅 [TypeScript 官方文档](https://www.typescriptlang.org/tsconfig/#declarationMap)。

您可以通过以下任一方式启用声明文件映射（无需同时设置）：

### 在 `tsconfig.json` 中启用

在 `compilerOptions` 下启用 `declarationMap` 选项：

```json [tsconfig.json]
{
  "compilerOptions": {
    "declarationMap": true
  }
}
```

### 在 tsdown 配置中启用

在 tsdown 配置文件中设置 `dts.sourcemap` 选项为 `true`：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    sourcemap: true,
  },
})
```

## 性能注意事项

`.d.ts` 生成的性能取决于您的 `tsconfig.json` 配置：

### 启用 `isolatedDeclarations`

如果您的 `tsconfig.json` 中启用了 `isolatedDeclarations` 选项，`tsdown` 将使用 **oxc-transform** 进行 `.d.ts` 生成。这种方式**极其快速**，强烈推荐以获得最佳性能。

```json [tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true
  }
}
```

### 未启用 `isolatedDeclarations`

如果未启用 `isolatedDeclarations`，`tsdown` 会回退使用 TypeScript 编译器生成 `.d.ts` 文件。虽然这种方式可靠，但相较于 `oxc-transform` 会慢一些。

> [!TIP]
> 如果速度对您的工作流程至关重要，建议在 `tsconfig.json` 中启用 `isolatedDeclarations`。

## dts 的构建流程

- **ESM 输出**：`.js` 和 `.d.ts` 文件在**同一个构建流程**中生成。如果遇到兼容性问题，请反馈。
- **CJS 输出**：会使用**单独的构建流程**专门生成 `.d.ts` 文件，以确保兼容性。

## 使用 tsgo（实验性）

`tsdown` 支持使用 [tsgo](https://github.com/nicholasdly/tsgo)（用 Go 编写的原生 TypeScript 移植版）生成 `.d.ts` 文件。这是一个实验性功能，可以提供更快的声明文件生成速度。

### 启用 tsgo

您可以在配置文件中启用 tsgo：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: true,
  },
})
```

### 自定义 tsgo 路径

如果您的 tsgo 安装在自定义位置（例如通过 Nix 管理），可以指定路径：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: {
      path: '/path/to/tsgo',
    },
  },
})
```

### 环境变量

您也可以通过 `TSGO_PATH` 环境变量设置 tsgo 路径。这在 CI 环境或不想修改配置文件时非常有用：

```bash
TSGO_PATH=/path/to/tsgo tsdown
```

> [!NOTE]
> 配置文件中的 `dts.tsgo` 选项优先于 `TSGO_PATH` 环境变量。

> [!WARNING]
> tsgo 支持是实验性的，尚不建议在生产环境中使用。

## 高级选项

`rolldown-plugin-dts` 提供了多个高级选项用于自定义 `.d.ts` 文件的生成。详细说明请参阅 [插件文档](https://github.com/sxzz/rolldown-plugin-dts#options)。
