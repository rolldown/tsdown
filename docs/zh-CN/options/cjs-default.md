# CJS 默认导出

`cjsDefault` 选项用于提升生成 CommonJS (CJS) 入口模块时的兼容性。该选项**默认启用**。

## 工作原理

当显式入口模块**仅有一个默认导出**且输出格式为 CJS 时，`tsdown` 会自动将：

- `export default ...`
  转换为
  `module.exports = ...`（在生成的 JavaScript 文件中）。

对于 TypeScript 声明文件（`.d.ts`），则会将：

- `export default ...`
  转换为
  `export = ...`

这样可以确保使用 CommonJS 的 require 语法（`require('your-module')`）的用户能够直接获得默认导出，从而提升与相关工具和环境的兼容性。

> [!NOTE]
> `cjsDefault` 仅适用于显式入口模块。在[非打包模式](./unbundle.md)下，作为非入口 chunk 输出的被导入模块仍会保留 `exports.default` 等具名 CJS 导出。CJS 已被视为旧版格式，仅处于维护模式，因此这一行为不会扩展到非入口 chunk。

如果每个源模块都需要被独立使用，请将它们全部配置为入口：

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts'],
  root: 'src',
  format: 'cjs',
  unbundle: true,
})
```

## 示例

**源模块：**

```ts
// src/index.ts
export default function greet() {
  console.log('Hello, world!')
}
```

**生成的 CJS 输出：**

```js
// dist/index.cjs
function greet() {
  console.log('Hello, world!')
}
module.exports = greet
```

**生成的声明文件：**

```ts
// dist/index.d.cts
declare function greet(): void
export = greet
```
