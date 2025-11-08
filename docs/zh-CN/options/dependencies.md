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

对于声明文件，`tsdown` 默认**不会打包任何依赖**。这确保 `.d.ts` 文件保持简洁，仅专注于您的库的类型。

### 自定义类型解析

您可以使用 `dts.resolve` 选项显式包含某些依赖的类型定义：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    resolve: ['lodash', /^@types\//],
  },
})
```

在此示例中，`lodash` 及所有 `@types` 命名空间下的包的类型定义会被打包进 `.d.ts` 文件。

### 解析器选项

在打包复杂的第三方类型时，您可能会遇到默认解析器（Oxc）无法处理某些场景。例如，`@babel/generator` 的类型定义实际位于 `@types/babel__generator` 包中，Oxc 可能无法正确解析。

为了解决此问题，您可以在配置中将 `resolver` 选项设置为 `tsc`，这样会使用原生 TypeScript 解析器，虽然速度较慢，但对复杂类型兼容性更好：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    resolve: ['@babel/generator'],
    resolver: 'tsc',
  },
})
```

如果您希望打包**所有**类型，可以将 `resolve: true`，但强烈建议同时设置 `resolver: 'tsc'` 以减少意外问题：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    resolve: true,
    resolver: 'tsc',
  },
})
```

## 总结

- **默认行为**：
  - `dependencies` 和 `peerDependencies` 被视为外部依赖，不会被打包。
  - `devDependencies` 和幻影依赖只有在代码中实际使用时才会被打包。
- **自定义**：
  - 使用 `external` 将特定依赖标记为外部依赖。
  - 使用 `noExternal` 强制将特定依赖打包。
- **声明文件**：
  - 默认不打包依赖。
  - 使用 `dts.resolve` 将特定依赖的类型包含进 `.d.ts` 文件。
  - 使用 `resolver: 'tsc'` 可提升复杂第三方类型的兼容性。

通过理解和自定义依赖处理，您可以确保您的库在体积和可用性方面都得到优化。
