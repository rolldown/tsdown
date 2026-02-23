# WASM 支持

`tsdown` 通过 [`rolldown-plugin-wasm`](https://github.com/sxzz/rolldown-plugin-wasm) 支持打包 WebAssembly（WASM）模块。该插件允许您在 TypeScript 或 JavaScript 代码中直接导入 `.wasm` 文件，同时支持同步和异步实例化。

## 最简示例

要配置 `tsdown` 支持 WASM，请在 `tsdown.config.ts` 中添加该插件：

```ts [tsdown.config.ts]
import { wasm } from 'rolldown-plugin-wasm'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  plugins: [wasm()],
})
```

安装所需依赖：

::: code-group

```sh [npm]
npm install -D rolldown-plugin-wasm
```

```sh [pnpm]
pnpm add -D rolldown-plugin-wasm
```

```sh [yarn]
yarn add -D rolldown-plugin-wasm
```

```sh [bun]
bun add -D rolldown-plugin-wasm
```

:::

## 导入 WASM 模块

您可以直接导入 WASM 模块：

```ts
import { add } from './add.wasm'

add(1, 2)
```

### 异步初始化

使用 `?init` 查询参数获取异步初始化函数：

```ts
import init from './add.wasm?init'

const instance = await init(
  imports, // 可选
)

instance.exports.add(1, 2)
```

### 同步初始化

使用 `?init&sync` 查询参数进行同步初始化：

```ts
import initSync from './add.wasm?init&sync'

const instance = initSync(
  imports, // 可选
)

instance.exports.add(1, 2)
```

## `wasm-bindgen` 支持

### 目标 `bundler`（默认，推荐）

```ts
import { add } from 'some-pkg'

add(1, 2)
```

### 目标 `web`

#### Node.js

```ts
import { readFile } from 'node:fs/promises'
import init, { add } from 'some-pkg'
import wasmUrl from 'some-pkg/add_bg.wasm?url'

await init({
  module_or_path: readFile(new URL(wasmUrl, import.meta.url)),
})

add(1, 2)
```

#### 浏览器

```ts
import init, { add } from 'some-pkg/add.js'
import wasmUrl from 'some-pkg/add_bg.wasm?url'

await init({
  module_or_path: wasmUrl,
})

add(1, 2)
```

> [!NOTE]
> 不支持其他 `wasm-bindgen` 目标，如 `nodejs` 和 `no-modules`。

## TypeScript 支持

要获得 `.wasm` 导入的类型支持，请在 `tsconfig.json` 中添加类型声明：

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "types": ["rolldown-plugin-wasm/types"],
  },
}
```

## 选项

该插件接受一个选项对象：

```ts
wasm({
  maxFileSize: 14 * 1024, // 内联的最大文件大小（默认：14KB）
  fileName: '[hash][extname]', // 输出文件名模式
  publicPath: '', // 非内联文件路径前缀
  targetEnv: 'auto', // 'auto' | 'auto-inline' | 'browser' | 'node'
})
```

| 选项          | 默认值              | 说明                                                                                                                                                                         |
| ------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxFileSize` | `14 * 1024`         | 内联的最大文件大小。超过此限制的文件将被复制到输出目录并在运行时加载。设为 `0` 表示始终复制。                                                                                |
| `fileName`    | `'[hash][extname]'` | 生成的 WASM 文件的命名模式。                                                                                                                                                 |
| `publicPath`  | —                   | 非内联 WASM 文件路径的前缀。                                                                                                                                                 |
| `targetEnv`   | `'auto'`            | 控制生成的实例化代码。`'auto'` 在运行时检测环境；`'auto-inline'` 始终内联并根据环境解码；`'browser'` 省略 Node.js 内置模块；`'node'` 省略 `fetch`（需要 Node.js 20.16.0+）。 |
