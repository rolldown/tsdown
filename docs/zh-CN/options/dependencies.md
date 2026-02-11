# 依赖处理

在使用 `tsdown` 打包时，依赖会被智能处理，以确保您的库保持轻量且易于使用。以下是 `tsdown` 如何处理不同类型依赖以及如何自定义此行为。

## 默认行为

### `dependencies` 和 `peerDependencies`

默认情况下，`tsdown` **不会打包** 在 `package.json` 中 `dependencies` 和 `peerDependencies` 下列出的依赖：

- **`dependencies`**：这些依赖会被视为外部依赖，不会被包含在打包文件中。当用户安装您的库时，npm（或其他包管理器）会自动安装这些依赖。
- **`peerDependencies`**：这些依赖同样被视为外部依赖。您的库的使用者需要手动安装这些依赖，尽管某些包管理器可能会自动处理。

### `devDependencies` 和幻影依赖

- **`devDependencies`**：在 `package.json` 中列为 `devDependencies` 的依赖，**只有在您的源码中实际被 import 或 require 时才会被打包**。
- **幻影依赖（Phantom Dependencies）**：存在于 `node_modules` 文件夹中但未明确列在 `package.json` 中的依赖，**只有在您的代码中实际被使用时才会被打包**。

换句话说，只有项目中实际引用的 `devDependencies` 和幻影依赖才会被包含进打包文件。

## `deps` 选项

所有依赖相关的选项都在 `deps` 字段下配置：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    neverBundle: ['lodash', /^@my-scope\//],
    alwaysBundle: ['some-package'],
    onlyAllowBundle: ['cac', 'bumpp'],
    skipNodeModulesBundle: true,
  },
})
```

### `deps.skipNodeModulesBundle`

如果您希望**跳过解析和打包所有来自 `node_modules` 的依赖**，可以启用 `skipNodeModulesBundle`：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
})
```

这样，无论您的代码如何引用，`tsdown` 都不会解析或打包任何来自 `node_modules` 的依赖。

::: warning
`skipNodeModulesBundle` 不能与 `alwaysBundle` 一起使用，这两个选项互斥。
:::

### `deps.onlyAllowBundle`

`onlyAllowBundle` 选项作为允许从 `node_modules` 中打包的依赖白名单。如果有任何不在列表中的依赖被打包，tsdown 将抛出错误。这对于防止意外的依赖被静默内联到输出文件中非常有用，尤其是在大型项目中可能存在许多依赖的情况下。

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    onlyAllowBundle: ['cac', 'bumpp'],
  },
})
```

在此示例中，只有 `cac` 和 `bumpp` 允许被打包。如果引入了任何其他 `node_modules` 依赖，tsdown 将抛出错误，指出哪个依赖被意外打包以及哪些文件引用了它。

#### 行为

- **`onlyAllowBundle` 为数组**（例如 `['cac', /^my-/]`）：只有匹配列表的依赖才允许被打包，其他依赖会触发错误。列表中未使用的模式也会被报告。
- **`onlyAllowBundle` 为 `false`**：抑制所有关于打包依赖的警告和检查。
- **`onlyAllowBundle` 未设置**（默认）：如果有 `node_modules` 依赖被打包，会显示一条警告，建议您添加 `onlyAllowBundle` 选项或将其设置为 `false` 来抑制警告。

::: tip
请确保在 `onlyAllowBundle` 列表中包含所有必需的子依赖，而不仅仅是您直接导入的顶层包。
:::

### `deps.neverBundle`

`neverBundle` 选项允许您显式将某些依赖标记为外部依赖，确保它们不会被打包进您的库。例如：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    neverBundle: ['lodash', /^@my-scope\//],
  },
})
```

在此示例中，`lodash` 和所有 `@my-scope` 命名空间下的包都将被视为外部依赖。

### `deps.alwaysBundle`

`alwaysBundle` 选项允许您强制将某些依赖打包，即使它们被列为 `dependencies` 或 `peerDependencies`。例如：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    alwaysBundle: ['some-package'],
  },
})
```

在这里，`some-package` 会被打包进您的库。

## 声明文件中的依赖处理

声明文件的打包逻辑与 JavaScript 保持一致：依赖是否被打包或被标记为外部，遵循相同的规则和选项。

### 解析器选项

在打包复杂的第三方类型时，您可能会遇到默认解析器（Oxc）无法处理某些场景。例如，`@babel/generator` 的类型定义实际位于 `@types/babel__generator` 包中，Oxc 可能无法正确解析。

为了解决此问题，您可以在配置中将 `resolver` 选项设置为 `tsc`，这样会使用原生 TypeScript 解析器，虽然速度较慢，但对复杂类型兼容性更好：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    resolver: 'tsc',
  },
})
```

## 从旧版选项迁移

以下顶层选项已被废弃，请迁移到 `deps` 命名空间：

| 废弃选项                | 新选项                       |
| ----------------------- | ---------------------------- |
| `external`              | `deps.neverBundle`           |
| `noExternal`            | `deps.alwaysBundle`          |
| `inlineOnly`            | `deps.onlyAllowBundle`       |
| `skipNodeModulesBundle` | `deps.skipNodeModulesBundle` |

## 总结

- **默认行为**：
  - `dependencies` 和 `peerDependencies` 被视为外部依赖，不会被打包。
  - `devDependencies` 和幻影依赖只有在代码中实际使用时才会被打包。
- **自定义**：
  - 使用 `deps.onlyAllowBundle` 设置允许被打包的依赖白名单，不在列表中的依赖会触发错误。
  - 使用 `deps.neverBundle` 将特定依赖标记为外部依赖。
  - 使用 `deps.alwaysBundle` 强制将特定依赖打包。
  - 使用 `deps.skipNodeModulesBundle` 跳过解析和打包所有来自 `node_modules` 的依赖。
- **声明文件**：
  - 声明文件的打包逻辑与 JavaScript 保持一致。
  - 使用 `resolver: 'tsc'` 可提升复杂第三方类型的兼容性。

通过理解和自定义依赖处理，您可以确保您的库在体积和可用性方面都得到优化。
