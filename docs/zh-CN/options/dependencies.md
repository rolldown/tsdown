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

## 跳过 `node_modules` 打包

如果您希望**跳过解析和打包所有来自 `node_modules` 的依赖**，可以在配置中启用 `skipNodeModulesBundle` 选项：

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  skipNodeModulesBundle: true,
})
```

这样，无论您的代码如何引用，`tsdown` 都不会解析或打包任何来自 `node_modules` 的依赖。

## 使用 `inlineOnly` 严格控制内联依赖

`inlineOnly` 选项作为允许从 `node_modules` 中打包的依赖白名单。如果有任何不在列表中的依赖被打包，tsdown 将抛出错误。这对于防止意外的依赖被静默内联到输出文件中非常有用，尤其是在大型项目中可能存在许多依赖的情况下。

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inlineOnly: ['cac', 'bumpp'],
})
```

在此示例中，只有 `cac` 和 `bumpp` 允许被打包。如果引入了任何其他 `node_modules` 依赖，tsdown 将抛出错误，指出哪个依赖被意外打包以及哪些文件引用了它。

### 行为

- **`inlineOnly` 为数组**（例如 `['cac', /^my-/]`）：只有匹配列表的依赖才允许被打包，其他依赖会触发错误。列表中未使用的模式也会被报告。
- **`inlineOnly` 为 `false`**：抑制所有关于打包依赖的警告和检查。
- **`inlineOnly` 未设置**（默认）：如果有 `node_modules` 依赖被打包，会显示一条警告，建议您添加 `inlineOnly` 选项或将其设置为 `false` 来抑制警告。

::: tip
请确保在 `inlineOnly` 列表中包含所有必需的子依赖，而不仅仅是您直接导入的顶层包。
:::

## 自定义依赖处理

`tsdown` 提供了两个选项来覆盖默认行为：

### `external`

`external` 选项允许您显式将某些依赖标记为外部依赖，确保它们不会被打包进您的库。例如：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  external: ['lodash', /^@my-scope\//],
})
```

在此示例中，`lodash` 和所有 `@my-scope` 命名空间下的包都将被视为外部依赖。

### `noExternal`

`noExternal` 选项允许您强制将某些依赖打包，即使它们被列为 `dependencies` 或 `peerDependencies`。例如：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  noExternal: ['some-package'],
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

## 总结

- **默认行为**：
  - `dependencies` 和 `peerDependencies` 被视为外部依赖，不会被打包。
  - `devDependencies` 和幻影依赖只有在代码中实际使用时才会被打包。
- **自定义**：
  - 使用 `inlineOnly` 设置允许被打包的依赖白名单，不在列表中的依赖会触发错误。
  - 使用 `external` 将特定依赖标记为外部依赖。
  - 使用 `noExternal` 强制将特定依赖打包。
  - 使用 `skipNodeModulesBundle` 跳过解析和打包所有来自 `node_modules` 的依赖。
- **声明文件**：
  - 声明文件的打包逻辑与 JavaScript 保持一致。
  - 使用 `resolver: 'tsc'` 可提升复杂第三方类型的兼容性。

通过理解和自定义依赖处理，您可以确保您的库在体积和可用性方面都得到优化。
