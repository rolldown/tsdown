# 从 tsup 迁移

[tsup](https://tsup.egoist.dev/) 是一个功能强大且广泛使用的打包器，与 `tsdown` 有许多相似之处。虽然 `tsup` 基于 [esbuild](https://esbuild.github.io/) 构建，`tsdown` 则利用了 [Rolldown](https://rolldown.rs/) 的强大能力，带来更**快速**、更**强大**的打包体验。

## 迁移指南

如果您当前正在使用 `tsup` 并希望迁移到 `tsdown`，迁移过程非常简单，只需使用专门的 `migrate` 命令：

```bash
npx tsdown-migrate
```

对于 monorepo 项目，您可以通过通配符模式指定目录：

```bash
npx tsdown-migrate packages/*
```

或者显式指定多个目录：

```bash
npx tsdown-migrate packages/foo packages/bar
```

> [!WARNING]
> 在迁移之前，请保存您的更改。迁移过程可能会修改您的配置文件，因此请确保所有更改已提交或备份。

> [!TIP]
> 迁移工具会在迁移后自动安装依赖。请确保在项目目录下运行该命令。

### 迁移选项

`migrate` 命令支持以下选项，用于自定义迁移过程：

- `[...dirs]`：指定要迁移的目录。支持通配符模式（如 `packages/*`）。如果未指定，默认为当前目录。
- `--dry-run`（或 `-d`）：执行预览迁移（dry run），不会进行任何实际更改。

通过这些选项，您可以轻松调整迁移过程以适应您的特定项目结构。

## 与 tsup 的区别

虽然 `tsdown` 旨在与 `tsup` 高度兼容，但仍有一些差异需要注意：

### 默认值

- **`format`**：默认值为 `esm`。
- **`clean`**：默认启用，每次构建前会清理 `outDir`。
- **`dts`**：如果您的 `package.json` 中包含 `typings` 或 `types` 字段，则会自动启用。
- **`target`**：默认会读取 `package.json` 中的 `engines.node` 字段（如有）。

### 功能差距

`tsdown` 尚未实现 `tsup` 中的某些功能。如果您发现缺少某些您需要的选项，请[提交 issue](https://github.com/rolldown/tsdown/issues) 告诉我们您的需求。

### tsdown 新增特性

`tsdown` 还引入了一些 `tsup` 不具备的新特性：

- **`nodeProtocol`**：控制 Node.js 内置模块导入的处理方式：
  - `true`：为内置模块添加 `node:` 前缀（如 `fs` → `node:fs`）
  - `'strip'`：移除导入中的 `node:` 前缀（如 `node:fs` → `fs`）
  - `false`：保持导入不变（默认）

迁移后，请仔细检查您的配置，确保其符合您的预期。

## 致谢

`tsdown` 的诞生离不开开源社区的启发和贡献。我们衷心感谢以下项目和个人：

- **[tsup](https://tsup.egoist.dev/)**：`tsdown` 深受 `tsup` 的启发，甚至部分代码直接来源于 `tsup`。`tsup` 的简洁性和高效性在 `tsdown` 的开发过程中起到了重要的指导作用。
- **[@egoist](https://github.com/egoist)**：`tsup` 的作者，其工作对 JavaScript 和 TypeScript 工具生态系统产生了深远的影响。感谢您对社区的奉献和贡献！
