# 从 tsup 迁移

[tsup](https://tsup.egoist.dev/) 是一个功能强大且广泛使用的打包器，与 `tsdown` 有许多相似之处。`tsup` 基于 [esbuild](https://esbuild.github.io/) 构建，而 `tsdown` 则利用了 [Rolldown](https://rolldown.rs/) 的强大能力，带来更**快速**、更**强大**的打包体验。

## 迁移指南

如果您当前正在使用 `tsup` 并希望迁移到 `tsdown`，迁移过程非常简单，因为 `tsdown` 提供了专门的 `migrate` 命令：

```bash
npx tsdown-migrate
```

> [!WARNING]
> 在迁移之前，请保存您的更改。迁移过程可能会修改您的配置文件，因此请确保所有更改已提交或备份。

### 迁移选项

`migrate` 命令支持以下选项，用于自定义迁移过程：

- `--cwd <dir>`（或 `-c`）：指定迁移的工作目录。
- `--dry-run`（或 `-d`）：执行预览迁移（dry run），不会进行任何实际更改。

通过这些选项，您可以轻松调整迁移过程以适应您的特定项目设置。

## 与 tsup 的区别

虽然 `tsdown` 旨在与 `tsup` 高度兼容，但仍有一些差异需要注意：

### 默认值

- **`format`**：默认值为 `esm`。
- **`clean`**：默认启用，每次构建前会清理 `outDir`。
- **`dts`**：如果您的 `package.json` 中包含 `typings` 或 `types` 字段，则会自动启用。
- **`target`**：默认情况下，如果 `package.json` 中存在 `engines.node` 字段，则会读取该字段的值。

### 功能差距

`tsdown` 尚未实现 `tsup` 中的某些功能。如果您发现缺少某些您需要的选项，请 [提交问题](https://github.com/rolldown/tsdown/issues) 告诉我们您的需求。

### tsdown 的新功能

`tsdown` 还引入了一些 `tsup` 中没有的新功能：

- **`nodeProtocol`**：控制 Node.js 内置模块导入的处理方式：
  - `true`：为内置模块添加 `node:` 前缀（例如，`fs` → `node:fs`）
  - `'strip'`：从导入中移除 `node:` 前缀（例如，`node:fs` → `fs`）
  - `false`：保持导入不变（默认）

迁移后，请仔细检查您的配置以确保其符合您的预期。

## 致谢

`tsdown` 的诞生离不开开源社区的启发和贡献。我们衷心感谢以下项目和个人：

- **[tsup](https://tsup.egoist.dev/)**：`tsdown` 深受 `tsup` 的启发，甚至部分代码直接来源于 `tsup`。`tsup` 的简洁性和高效性在 `tsdown` 的开发过程中起到了重要的指导作用。
- **[@egoist](https://github.com/egoist)**：`tsup` 的作者，其工作对 JavaScript 和 TypeScript 工具生态系统产生了深远的影响。感谢您对社区的奉献和贡献！
