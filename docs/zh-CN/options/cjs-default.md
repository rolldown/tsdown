# CJS 默认导出

`cjsDefault` 选项用于提升生成 CommonJS (CJS) 模块时的兼容性。该选项**默认启用**。

## 工作原理

当您的模块**仅有一个默认导出**且输出格式为 CJS 时，`tsdown` 会自动将：

- `export default ...`
  转换为
  `module.exports = ...`（在生成的 JavaScript 文件中）。

对于 TypeScript 声明文件（`.d.ts`），则会将：

- `export default ...`
  转换为
  `export = ...`

这样可以确保使用 CommonJS 的 require 语法（`require('your-module')`）的用户能够直接获得默认导出，从而提升与相关工具和环境的兼容性。

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
function hello() {
  console.log('Hello, world!')
}
module.exports = hello
```

**生成的声明文件：**

```ts
// dist/index.d.cts
declare function hello(): void
export = hello
```
