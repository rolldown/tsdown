# 根目录

`root` 选项用于指定输入文件的根目录，作用类似于 TypeScript 的 [`rootDir`](https://www.typescriptlang.org/tsconfig/#rootDir)。它决定了如何根据入口文件计算输出目录结构。

## 默认行为

默认情况下，`root` 会自动计算为所有入口文件的**公共基础目录**。例如，如果入口文件是 `src/a.ts` 和 `src/b.ts`，那么根目录就会是 `src/`。

## 如何配置

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/utils/helper.ts'],
  root: 'src',
})
```

或者通过 CLI：

```bash
tsdown --root src
```

## 工作方式

`root` 选项会影响以下两种行为：

1. **入口名称解析**：当 `entry` 使用数组形式时，相对于 `root` 的文件路径会决定输出文件名。
2. **Unbundle 模式**：在 unbundle 模式下，`root` 会作为 `preserveModulesRoot` 使用，用来控制输出目录结构。

### 示例

假设项目结构如下：

```
project/
  src/
    index.ts
    utils/
      helper.ts
```

#### 不设置 `root`（默认行为）

```ts
export default defineConfig({
  entry: ['src/index.ts', 'src/utils/helper.ts'],
})
```

公共基础目录是 `src/`，因此输出会是：

```
dist/
  index.js
  utils/
    helper.js
```

#### 显式设置 `root`

```ts
export default defineConfig({
  entry: ['src/index.ts', 'src/utils/helper.ts'],
  root: '.',
})
```

此时根目录是项目目录，因此输出会保留 `src/` 这一层前缀：

```
dist/
  src/
    index.js
    utils/
      helper.js
```

## 适用场景

- 当自动计算出的公共基础目录无法生成你期望的输出结构时。
- 当你希望输出路径包含或排除某些目录前缀时。
- 当你使用 unbundle 模式，并且需要更细粒度地控制输出目录映射时。
