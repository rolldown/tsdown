# 工作原理

本页面概述了 tsdown 的默认行为以及用于调整各项行为的主要选项。如需了解完整细节，请点击链接查看相应的选项页面。

## 智能默认值一览 {#smart-defaults}

tsdown 读取你的 `package.json` 和 `tsconfig.json` 来推断合理的默认值。以下是自动执行的行为：

| 当 tsdown 检测到... | 它会... |
| --- | --- |
| package.json 中的 `dependencies` / `peerDependencies` | 将其外部化（不打包） |
| 代码中导入了 `devDependency` | 将其打包到输出中 |
| package.json 中的 `types` 或 `typings` 字段 | 启用 `.d.ts` 生成 |
| tsconfig.json 中的 `isolatedDeclarations` | 使用快速的 **oxc-transform** 路径生成 dts |
| package.json 中的 `engines.node` | 从中推断编译[目标](../options/target.md) |
| package.json 中的 `type: "module"` | ESM 输出使用 `.js` 扩展名（而非 `.mjs`） |
| 未指定 `entry`，但存在 `src/index.ts` | 将其作为默认入口点 |
| `platform: "node"`（默认值） | 启用 [`fixedExtension`](../options/output-format.md)（`.mjs`/`.cjs`） |
| 双格式构建且 `exports: true` | 在 package.json 中生成 `main`/`module` 传统字段 |
| [监听模式](../options/watch-mode.md)下配置文件变更 | 重启整个构建 |

以下各节将详细介绍每个领域。

## 依赖处理 {#dependencies}

当你发布一个库时，使用者会自动安装其 `dependencies` 和 `peerDependencies`。因此无需将这些包打包到输出中——它们在运行时已经存在。

**默认行为：**

- **`dependencies` 和 `peerDependencies`** 会被**外部化**——它们在输出中以 `import` / `require` 语句的形式出现，不会被包含在 bundle 中。
- **`devDependencies`** 在被导入时会被**打包**。由于使用者不会安装它们，你从 devDependency 中导入的代码会自动内联到输出中。
- **幽灵依赖**（存在于 `node_modules` 中但未列在 `package.json` 中的依赖）遵循与 devDependencies 相同的规则——仅在被使用时才会打包。

**主要选项：**

| 选项                                                                                 | 说明                                                                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [`inlineOnly`](../options/dependencies.md#strict-inline-control-with-inlineonly)     | 允许打包的依赖白名单。任何不在列表中的依赖如果出现在 bundle 中将触发错误。适用于防止大型项目中的意外内联。 |
| [`external`](../options/dependencies.md#external)                                    | 显式将额外的包标记为外部依赖（不打包）。                                                                   |
| [`noExternal`](../options/dependencies.md#noexternal)                                | 强制打包特定的包，即使它们在 `dependencies` 中。                                                           |
| [`skipNodeModulesBundle`](../options/dependencies.md#skipping-node-modules-bundling) | 跳过解析和打包所有来自 `node_modules` 的内容。                                                             |

详见[依赖](../options/dependencies.md)。

## 输出格式 {#output-format}

tsdown 默认生成 **ESM** 输出。你可以在单次构建中生成多种格式，还可以按格式覆盖选项。

**主要选项：**

| 选项                                    | 说明                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`format`](../options/output-format.md) | 设为 `esm`、`cjs`、`iife` 或 `umd`。传递多个值（如 `format: ['esm', 'cjs']`）实现双格式构建。 |
| [`shims`](../options/shims.md)          | 注入兼容代码（如为 ESM 注入 `__dirname`，为 CJS 注入 `import.meta`）。                        |

详见[输出格式](../options/output-format.md)。

## 声明文件 (dts) {#dts}

tsdown 生成 `.d.ts` 文件，使使用者获得完整的 TypeScript 支持。

**默认行为：**

- 如果 `package.json` 中有 `types` 或 `typings` 字段，dts 生成将**自动启用**。
- 如果 `tsconfig.json` 中启用了 [`isolatedDeclarations`](https://www.typescriptlang.org/tsconfig/#isolatedDeclarations)，tsdown 会使用快速的 **oxc-transform** 路径。否则将回退到 TypeScript 编译器。

**主要选项：**

| 选项                       | 说明                                                                |
| -------------------------- | ------------------------------------------------------------------- |
| [`dts`](../options/dts.md) | 启用/禁用 dts，或传入对象进行高级设置如 `resolver` 和 `sourcemap`。 |

详见[声明文件](../options/dts.md)。

## 包导出 {#package-exports}

发布库时，`package.json` 中的 `exports` 字段告诉使用者和打包工具如何解析你的包的入口点。

**默认行为：**

- `exports` 的自动生成**默认关闭**。你需要自行管理 `package.json` 中的 `exports` 字段。

**启用 `exports: true` 后：**

- tsdown 会分析你的入口点和输出文件，然后自动写入 `package.json` 中的 `exports`、`main`、`module` 和 `types` 字段。
- 对于双格式构建（ESM + CJS），它会生成带有 `import` 和 `require` 条件的条件导出。

**主要选项：**

| 选项                                                                         | 说明                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| [`exports`](../options/package-exports.md)                                   | 设为 `true` 启用自动生成，或传入对象进行细调。 |
| [`exports.all`](../options/package-exports.md#exporting-all-files)           | 导出所有输出文件，而不仅仅是入口点。           |
| [`exports.devExports`](../options/package-exports.md#dev-exports)            | 开发时将导出指向源文件，获得更好的编辑器支持。 |
| [`exports.customExports`](../options/package-exports.md#customizing-exports) | 一个函数，用于修改或扩展生成的导出。           |

详见[包导出](../options/package-exports.md)。

## 包校验 {#package-validation}

tsdown 集成了 [publint](https://publint.dev/) 和 [attw](https://arethetypeswrong.github.io/) 来在发布前捕获常见错误。

**默认行为：**

- 两个工具**默认均未启用**，且作为可选的 peer 依赖。

**它们检查什么：**

- **publint** 校验 `package.json` 配置——检查 `exports`、`main`、`module` 和 `types` 是否指向实际存在的文件，模块格式是否正确，并标记常见的配置错误。
- **attw**（Are the types wrong?）验证 TypeScript 声明文件在不同模块解析策略（`node10`、`node16`、`bundler`）下能否正确解析，捕获如错误的 ESM/CJS 类型声明等问题。

**主要选项：**

| 选项                                                  | 说明                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| [`publint`](../options/lint.md#publint)               | 设为 `true` 或 `'ci-only'` 启用。                                   |
| [`attw`](../options/lint.md#attw-are-the-types-wrong) | 设为 `true` 或传入带有 `profile`、`level` 和 `ignoreRules` 的对象。 |

详见[包校验](../options/lint.md)。

## 其他默认行为 {#other-defaults}

tsdown 还为你处理的一些事项：

- **输出目录** — 默认为 `dist/`。每次构建前会**清理输出目录**。使用 `--no-clean` 保留已有文件。详见[清理](../options/cleaning.md)。
- **除屑优化** — 默认启用。无用代码会从输出中移除。详见[除屑优化](../options/tree-shaking.md)。
- **运行平台** — 默认为 `node`。详见[运行平台](../options/platform.md)。
- **构建目标** — 从 `package.json` 的 `engines` 字段推断，若无则默认为最新稳定版 Node.js。详见[构建目标](../options/target.md)。
