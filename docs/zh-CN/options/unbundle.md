# 非打包模式（Unbundle Mode）

`tsdown` 的**非打包模式**允许您输出与源代码结构高度一致的文件，而不是为每个入口生成单一的打包文件。在该模式下，每个源文件都会被单独编译和转换，输出目录将与您的源文件目录一一对应。这种方式通常被称为「无打包（bundleless）」或「仅转译（transpile-only）」构建，重点在于代码转换而非合并打包。

## 如何启用

您可以在 `tsdown` 配置中将 `unbundle` 选项设置为 `true` 来启用非打包模式：

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true,
})
```

## 工作原理

启用非打包模式后，从入口文件（直接或间接）引用的每个源文件都会被编译，并输出到输出目录的对应位置。这意味着输出结构会与您的源目录结构高度一致，方便追溯输出文件对应的源文件。

### 示例

假设您的项目结构如下：

```
src/
  index.ts
  mod.ts
```

并且 `src/index.ts` 引用了 `src/mod.ts`：

```ts [src/index.ts]
import { foo } from './mod'

foo()
```

```ts [src/mod.ts]
export function foo() {
  console.log('Hello from mod!')
}
```

在设置 `unbundle: true` 后，即使只将 `src/index.ts` 作为入口，`src/index.ts` 和 `src/mod.ts` 都会被编译并分别输出为独立文件：

```
dist/
  index.js
  mod.js
```

每个输出文件都与其源文件一一对应，保留了原始代码库的模块结构。

## 控制输出根目录

默认情况下，输出目录结构基于所有入口文件的公共基础目录。您可以使用 [`root`](/zh-CN/options/root) 选项覆盖此行为：

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true,
  root: '.', // 在输出中保留 `src/` 前缀
})
```

## 适用场景

非打包模式非常适合以下场景：

- 需要保持源文件与输出文件一一对应的清晰映射。
- 不希望将所有模块打包在一起，例如在 monorepo 或库开发场景下，用户可能希望单独引入某些模块。
- 只关注代码转换（如 TypeScript 转 JavaScript），而不需要合并文件。
