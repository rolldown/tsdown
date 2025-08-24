# 构建目标（Target）

`target` 设置决定了哪些 JavaScript 和 CSS 特性会被降级（转换为旧语法），哪些会在输出中保持原样。这使您可以控制打包代码与特定环境或 JavaScript 版本的兼容性。

例如，如果目标是 `es5` 或更低版本，箭头函数 `() => this` 将被转换为等效的 `function` 表达式。

> [!WARNING] 仅限语法降级
> `target` 选项仅影响语法转换。它不会为目标环境中可能不存在的 API 提供运行时 polyfill 或 shim。例如，如果您的代码使用了 `Promise`，但目标环境不支持原生 `Promise`，则不会自动添加 polyfill。

## 默认目标行为

默认情况下，`tsdown` 会读取您的 `package.json` 中的 `engines.node` 字段，并自动将目标设置为所声明的最低兼容 Node.js 版本。这可以确保您的输出与您为包声明的运行环境兼容。

例如，如果您的 `package.json` 包含：

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

那么 `tsdown` 会自动将目标设置为 `node18.0.0`。

如果您希望覆盖此行为，可以通过 CLI 或配置文件显式指定目标。

## 自定义目标

您可以使用 `--target` 选项指定目标：

```bash
tsdown --target <target>
```

### 支持的目标

- ECMAScript 版本：`es5`、`es2015`、`es2020`、`esnext` 等
- 浏览器版本：`chrome100`、`safari18`、`firefox110` 等
- Node.js 版本：`node20.18`、`node16` 等

### 示例

```bash
tsdown --target es2020
```

您还可以传递多个目标，以确保兼容多个环境：

```bash
tsdown --target chrome100 --target node20.18
```

## 运行时辅助工具

在降级某些现代 JavaScript 特性时，`tsdown` 可能需要由 `@oxc-project/runtime` 包提供的运行时辅助工具。例如，将 `await` 表达式转换为旧语法时，需要使用辅助工具 `@oxc-project/runtime/helpers/asyncToGenerator`。

如果您的目标环境包含需要这些辅助工具的特性，您可能需要在项目中安装 `@oxc-project/runtime` 包：

::: code-group

```sh [npm]
npm install @oxc-project/runtime
```

```sh [pnpm]
pnpm add @oxc-project/runtime
```

```sh [yarn]
yarn add @oxc-project/runtime
```

```sh [bun]
bun add @oxc-project/runtime
```

:::

如果您希望**内联辅助函数**，而不是从运行时包中导入它们，可以将 `@oxc-project/runtime` 作为开发依赖进行安装：

::: code-group

```sh [npm]
npm install -D @oxc-project/runtime
```

```sh [pnpm]
pnpm add -D @oxc-project/runtime
```

```sh [yarn]
yarn add -D @oxc-project/runtime
```

```sh [bun]
bun add -D @oxc-project/runtime
```

:::

# CSS 目标

`tsdown` 也可以将 CSS 特性降级以匹配您指定的浏览器目标。例如，如果目标是 `chrome108` 或更低版本，CSS 嵌套的 `&` 选择器将被展开为平铺结构。

要启用 CSS 降级，您需要手动安装 [`unplugin-lightningcss`](https://github.com/unplugin/unplugin-lightningcss)：

::: code-group

```sh [npm]
npm install -D unplugin-lightningcss
```

```sh [pnpm]
pnpm add -D unplugin-lightningcss
```

```sh [yarn]
yarn add -D unplugin-lightningcss
```

```sh [bun]
bun add -D unplugin-lightningcss
```

:::

安装后，只需在配置或 CLI 选项中设置您的浏览器目标（例如 `target: 'chrome100'`），CSS 降级将会自动启用。

有关浏览器目标和 CSS 兼容性的更多信息，请参阅 [Lightning CSS 文档](https://lightningcss.dev/)。
