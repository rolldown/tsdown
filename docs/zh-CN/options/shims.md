# Shims（兼容代码）

Shim 是用于 CommonJS (CJS) 和 ECMAScript Modules (ESM) 之间兼容性的小型代码片段。在 `tsdown` 中，shims 用于弥合这些系统之间的差异，确保您的代码能够在不同环境中顺畅运行。

## ESM 中的 CommonJS 变量

在 CommonJS 中，`__dirname` 和 `__filename` 是内置变量，分别提供当前模块的目录路径和文件路径。然而，这些变量在 ESM 中**默认不可用**。

为了提高兼容性，当启用 `shims` 选项时，`tsdown` 会为 ESM 输出自动生成这些变量。例如：

```js
console.log(__dirname) // 启用 shims 时，ESM 中可用
console.log(__filename) // 启用 shims 时，ESM 中可用
```

### 运行时开销

为 `__dirname` 和 `__filename` 生成的 shims 会引入极小的运行时开销。然而，如果您的代码中未使用这些变量，它们将在打包过程中被自动移除，确保不会包含不必要的代码。

## ESM 中的 `require` 函数

当在 ESM 输出中使用 `require` 函数且 `platform` 设置为 `node` 时，无论是否启用 `shims`，`tsdown` 都会**自动注入基于 Node.js `createRequire` 的 `require` shim**。这样可以确保您在 Node.js 环境下的 ESM 模块中无需手动设置即可直接使用 `require`。

例如：

```js
// const require = createRequire(import.meta.url) [自动注入]

const someModule = require('some-module')
```

此行为在针对 Node.js 的 ESM 输出中始终启用，无需额外配置即可使用 `require`。

## CommonJS 中的 ESM 变量

即使未启用 `shims` 选项，`tsdown` 也会在 CommonJS 输出中自动生成以下 ESM 特定变量的 shims：

- `import.meta.url`
- `import.meta.dirname`
- `import.meta.filename`

这些变量用于确保在 CommonJS 环境中使用 ESM 特性时的兼容性。例如：

```js
console.log(import.meta.url)
console.log(import.meta.dirname)
console.log(import.meta.filename)
```

此行为在 CommonJS 输出中始终启用，无需任何额外配置即可使用这些变量。

## 启用 Shims

要在 ESM 输出中启用 `__dirname` 和 `__filename` 的 shims，可以在 CLI 中使用 `--shims` 选项，或在配置文件中设置 `shims: true`：

### CLI

```bash
tsdown --shims
```

### 配置文件

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  shims: true,
})
```
