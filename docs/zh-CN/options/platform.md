# 运行平台（Platform）

运行平台用于指定打包后 JavaScript 代码的目标运行环境。

默认情况下，`tsdown` 针对 `node` 运行时进行打包，但您可以通过 `--platform` 选项自定义目标平台：

```bash
tsdown --platform node    # 默认
tsdown --platform browser
tsdown --platform neutral
```

### 可用平台

- **`node`：** 针对 [Node.js](https://nodejs.org/) 运行时及兼容环境（如 Deno 和 Bun）。这是默认平台，Node.js 内置模块（如 `fs`、`path`）会被自动解析。适合工具链或服务端项目。
- **`browser`：** 针对 Web 浏览器（如 Chrome、Firefox）。适用于前端项目。如果您的代码使用了 Node.js 内置模块，将会显示警告，您可能需要使用 polyfill 或 shim 来确保兼容性。
- **`neutral`：** 与平台无关的目标，不对特定运行时环境做假设。如果您的代码需要在多个环境中运行，或者您希望完全控制运行时行为，可以选择此选项。特别适合用于 Node.js 和浏览器环境的库或共享代码。

> [!NOTE]
> 对于 CJS 格式，平台始终为 `'node'`，无法更改。 [为什么？](https://github.com/rolldown/rolldown/pull/4693#issuecomment-2912229545)

### 模块解析

不同平台使用不同的解析策略来确定包的入口点。`mainFields` 选项决定了检查 `package.json` 中的哪些字段：

- **`node`：** `['main', 'module']`
- **`browser`：** `['browser', 'module', 'main']`
- **`neutral`：** `[]`（仅依赖 `exports` 字段）

使用 `neutral` 平台时，没有 `exports` 字段的包可能会出现解析问题。如果遇到如下警告：

```
Help: The "main" field here was ignored. Main fields must be configured explicitly when using the "neutral" platform.
```

请在 `inputOptions.resolve` 中显式配置 `mainFields`：

```ts
export default defineConfig({
  platform: 'neutral',
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main'],
    },
  },
})
```

更多详情请参阅 [Rolldown 解析选项文档](https://rolldown.rs/options/resolve#mainfields)。

### 示例

```bash
# 针对 Node.js 打包（默认）
tsdown --platform node

# 针对浏览器打包
tsdown --platform browser

# 针对中立平台打包
tsdown --platform neutral
```

> [!TIP]
> 选择正确的平台可以确保您的代码针对目标运行时进行了优化。例如，前端项目使用 `browser`，服务端应用使用 `node`，而通用库使用 `neutral`。
