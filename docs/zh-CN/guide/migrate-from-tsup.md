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

| 选项     | tsup     | tsdown                                                         |
| -------- | -------- | -------------------------------------------------------------- |
| `format` | `'cjs'`  | `'esm'`                                                        |
| `clean`  | `false`  | `true`（每次构建前清理 `outDir`）                              |
| `dts`    | `false`  | 如果 `package.json` 中包含 `types` 或 `typings` 字段则自动启用 |
| `target` | _（无）_ | 自动读取 `package.json` 中的 `engines.node` 字段               |

### 选项重命名

部分选项已重命名以提高清晰度：

| tsup             | tsdown       | 说明                          |
| ---------------- | ------------ | ----------------------------- |
| `cjsInterop`     | `cjsDefault` | CJS 默认导出处理              |
| `esbuildPlugins` | `plugins`    | 现使用 Rolldown/Unplugin 插件 |

### 已弃用但兼容的选项

以下 tsup 选项在 tsdown 中仍然可用（向后兼容），但会发出弃用警告，**未来版本将会移除**。请立即迁移到推荐的替代方案。

| tsup（已弃用）             | tsdown（推荐）                          | 说明                   |
| -------------------------- | --------------------------------------- | ---------------------- |
| `entryPoints`              | `entry`                                 | 在 tsup 中也已弃用     |
| `publicDir`                | `copy`                                  | 复制静态文件到输出目录 |
| `bundle: false`            | `unbundle: true`                        | 转换为正向表达         |
| `removeNodeProtocol: true` | `nodeProtocol: 'strip'`                 | 更灵活，支持多种模式   |
| `injectStyle: true`        | `css: { inject: true }`                 | 移入 CSS 命名空间      |
| `external: [...]`          | `deps: { neverBundle: [...] }`          | 移入 deps 命名空间     |
| `noExternal: [...]`        | `deps: { alwaysBundle: [...] }`         | 移入 deps 命名空间     |
| `skipNodeModulesBundle`    | `deps: { skipNodeModulesBundle: true }` | 移入 deps 命名空间     |

tsdown 还新增了 `deps.onlyBundle`，用于白名单指定允许打包的依赖。

### 插件系统

tsdown 使用 [Rolldown](https://rolldown.rs/) 插件代替 esbuild 插件。如果您使用 [unplugin](https://github.com/unjs/unplugin) 插件，需更新导入路径：

```ts
// 迁移前 (tsup)
import plugin from 'unplugin-example/esbuild'

// 迁移后 (tsdown)
import plugin from 'unplugin-example/rolldown'
```

### 不支持的选项

以下 tsup 选项在 tsdown 中不可用：

| 选项                     | 状态     | 替代方案                                              |
| ------------------------ | -------- | ----------------------------------------------------- |
| `splitting: false`       | 始终启用 | 代码分割无法禁用                                      |
| `metafile`               | 不可用   | 使用 `devtools: true` 通过 Vite DevTools 分析打包产物 |
| `swc`                    | 不支持   | tsdown 内置使用 oxc 进行转换                          |
| `experimentalDts`        | 已取代   | 请使用 `dts` 选项                                     |
| `legacyOutput`           | 不支持   | 无替代方案                                            |
| `plugins`（tsup 实验性） | 不兼容   | 请迁移到 Rolldown 插件                                |

如果您发现缺少某些您需要的选项，请[提交 issue](https://github.com/rolldown/tsdown/issues) 告诉我们您的需求。

### tsdown 新增特性

`tsdown` 引入了许多 `tsup` 不具备的新特性：

- **`nodeProtocol`**：控制 Node.js 内置模块导入的处理方式：
  - `true`：为内置模块添加 `node:` 前缀（如 `fs` → `node:fs`）
  - `'strip'`：移除导入中的 `node:` 前缀（如 `node:fs` → `fs`）
  - `false`：保持导入不变（默认）
- **`workspace`**：通过 `workspace: 'packages/*'` 在 monorepo 中构建多个包
- **`exports`**：通过 `exports: true` 自动生成 `package.json` 中的 `exports` 字段
- **`publint`** / **`attw`**：验证包的常见问题和类型正确性
- **`exe`**：通过 `exe: true` 打包为 Node.js 独立可执行文件（SEA）
- **`devtools`**：通过 `devtools: true` 集成 Vite DevTools 进行打包分析
- **`hooks`**：生命周期钩子（`build:prepare`、`build:before`、`build:done`）用于自定义构建逻辑
- **`css`**：完整的 CSS 处理管线，支持预处理器、Lightning CSS、PostCSS、CSS Modules 和代码分割
- **`globImport`**：支持 `import.meta.glob`（Vite 风格的 glob 导入）

迁移后，请仔细检查您的配置，确保其符合您的预期。

> [!TIP]
> 可安装 AI skill 获取迁移引导：`npx skills add rolldown/tsdown-migrate`

## 致谢

`tsdown` 的诞生离不开开源社区的启发和贡献。我们衷心感谢以下项目和个人：

- **[tsup](https://tsup.egoist.dev/)**：`tsdown` 深受 `tsup` 的启发，甚至部分代码直接来源于 `tsup`。`tsup` 的简洁性和高效性在 `tsdown` 的开发过程中起到了重要的指导作用。
- **[@egoist](https://github.com/egoist)**：`tsup` 的作者，其工作对 JavaScript 和 TypeScript 工具生态系统产生了深远的影响。感谢您对社区的奉献和贡献！
