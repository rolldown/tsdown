# 可执行文件

:::warning 实验性
`exe` 选项目前是实验性的，可能会在未来版本中发生变化。
:::

tsdown 可以使用 [Node.js 单可执行应用](https://nodejs.org/api/single-executable-applications.html)将你的 TypeScript/JavaScript 代码打包为独立的可执行文件。输出的是原生二进制文件，无需安装 Node.js 即可运行。

## 环境要求

- Node.js >= 25.5.0（ESM 支持需要 >= 25.7.0）
- 不支持 Bun 和 Deno

## 基本用法

```bash
tsdown src/cli.ts --exe
```

或者在配置文件中使用：

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: true,
})
```

启用 `exe` 时：

- 默认输出格式从 `esm` 变更为 `cjs`（Node.js >= 25.7.0 支持 ESM 时除外）
- 默认禁用声明文件生成（`dts`）
- 禁用代码分割
- 仅支持单入口

## 高级配置

可以传递对象给 `exe` 以获得更多控制：

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: {
    fileName: 'my-tool',
    seaConfig: {
      disableExperimentalSEAWarning: true,
      useCodeCache: true,
    },
  },
})
```

### `fileName`

自定义可执行文件的输出名称。不需要包含 `.exe`、平台后缀或架构后缀，它们会自动添加。

可以是字符串或函数：

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  // 字符串
  exe: { fileName: 'my-tool' },
  // 或函数
  // exe: { fileName: (chunk) => `my-tool-${chunk.name}` },
})
```

### `seaConfig`

直接传递选项给 Node.js。详见 [Node.js 文档](https://nodejs.org/api/single-executable-applications.html)。

| 选项                            | 类型                       | 默认值  | 描述                     |
| ------------------------------- | -------------------------- | ------- | ------------------------ |
| `disableExperimentalSEAWarning` | `boolean`                  | `true`  | 禁用实验性警告           |
| `useSnapshot`                   | `boolean`                  | `false` | 使用 V8 快照加速启动     |
| `useCodeCache`                  | `boolean`                  | `false` | 使用 V8 代码缓存加速启动 |
| `execArgv`                      | `string[]`                 | —       | 额外的 Node.js CLI 参数  |
| `execArgvExtension`             | `'none' \| 'env' \| 'cli'` | `'env'` | 运行时如何扩展 execArgv  |
| `assets`                        | `Record<string, string>`   | —       | 嵌入到可执行文件中的资产 |

## 跨平台构建

默认情况下，`exe` 仅为当前平台构建。要从一台机器上为多个平台构建可执行文件，请安装 `@tsdown/exe` 包并使用 `targets` 选项：

::: code-group

```bash [pnpm]
pnpm add -D @tsdown/exe
```

```bash [npm]
npm install -D @tsdown/exe
```

```bash [yarn]
yarn add -D @tsdown/exe
```

:::

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: {
    targets: [
      { platform: 'linux', arch: 'x64', nodeVersion: '25.7.0' },
      { platform: 'darwin', arch: 'arm64', nodeVersion: '25.7.0' },
      { platform: 'win', arch: 'x64', nodeVersion: '25.7.0' },
    ],
  },
})
```

这会从 nodejs.org 下载目标平台的 Node.js 二进制文件，缓存到本地，并使用它来构建可执行文件。输出文件会带有平台和架构后缀：

```
dist/
  cli-linux-x64
  cli-darwin-arm64
  cli-win-x64.exe
```

### Target 选项

`targets` 数组中的每个 target 接受以下字段：

| 字段          | 类型                           | 描述                                   |
| ------------- | ------------------------------ | -------------------------------------- |
| `platform`    | `'win' \| 'darwin' \| 'linux'` | 目标操作系统（与 nodejs.org 命名一致） |
| `arch`        | `'x64' \| 'arm64'`             | 目标 CPU 架构                          |
| `nodeVersion` | `string`                       | 使用的 Node.js 版本（必须 `>=25.7.0`） |

:::warning
当指定 `targets` 时，`seaConfig.executable` 选项会被忽略——将使用下载的 Node.js 二进制文件。
:::

### 缓存

下载的 Node.js 二进制文件会缓存在系统缓存目录中：

- **macOS:** `~/Library/Caches/tsdown/node/`
- **Linux:** `~/.cache/tsdown/node/`（或 `$XDG_CACHE_HOME/tsdown/node/`）
- **Windows:** `%LOCALAPPDATA%/tsdown/Caches/node/`

后续构建会复用缓存的二进制文件，无需重新下载。

## 平台说明

- 在 **macOS** 上，可执行文件会自动进行临时签名（ad-hoc）以兼容 Gatekeeper。从非 macOS 主机交叉编译 macOS 目标时，签名会被跳过并显示警告。
- 在 **Windows** 上，会自动添加 `.exe` 扩展名。
