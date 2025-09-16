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

## 禁用目标转换

您可以通过将目标设置为 `false` 来禁用所有语法转换。这将在输出中保留现代 JavaScript 和 CSS 语法，无论您的 `package.json` 中指定的环境如何。

```json
{
  "target": false
}
```

当 `target` 设置为 `false` 时：
- 不会进行 JavaScript 语法降级（现代特性如可选链 `?.`、空值合并 `??` 等会被保留）
- 不会应用 CSS 语法转换（现代 CSS 特性如嵌套会被保留）
- 不会加载运行时辅助插件
- 输出将使用源代码中的确切语法

这在以下情况下特别有用：
- 您的目标是支持最新 JavaScript/CSS 特性的现代环境
- 您希望在不同的构建步骤中处理语法转换
- 您正在构建一个将由使用应用程序进一步处理的库

> [!NOTE] 无目标解析
> 如果您没有指定 `target` 且您的 `package.json` 没有 `engines.node` 字段，`tsdown` 将表现得就像设置了 `target: false` 一样，保留所有现代语法。

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
