# 依赖处理

在使用 `tsdown` 打包时，依赖会被智能处理，以确保您的库保持轻量且易于使用。以下是 `tsdown` 如何处理不同类型依赖以及如何自定义此行为。

## 默认行为

### `dependencies`、`peerDependencies` 和 `optionalDependencies`

默认情况下，`tsdown` **不会打包** 在 `package.json` 中 `dependencies`、`peerDependencies` 和 `optionalDependencies` 下列出的依赖：

- **`dependencies`**：这些依赖会被视为外部依赖，不会被包含在打包文件中。当用户安装您的库时，npm（或其他包管理器）会自动安装这些依赖。
- **`peerDependencies`**：这些依赖同样被视为外部依赖。您的库的使用者需要手动安装这些依赖，尽管某些包管理器可能会自动处理。
- **`optionalDependencies`**：这些依赖同样被视为外部依赖。它们可能根据用户的平台和配置安装或不安装。

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
    onlyBundle: ['cac', 'bumpp'],
    onlyImport: ['cac'],
    resolveDepSubpath: true,
  },
})
```

### `deps.skipNodeModulesBundle`

::: warning 已废弃
`skipNodeModulesBundle` 已废弃，请使用 [`deps.neverBundle: true`](#外部化所有依赖) 代替。
:::

### `deps.resolveDepSubpath`

默认情况下，tsdown 会保留外部依赖原有的子路径导入。当依赖没有 `exports` 字段时，可以启用 `resolveDepSubpath`，将子路径导入解析为包内的实际相对路径。例如，`my-dep/functions/lt` 可能会变为 `my-dep/functions/lt.js`，而 `my-dep/folder` 可能会变为 `my-dep/folder/index.js`。

将 `resolveDepSubpath` 设置为 `true` 可启用此行为：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    resolveDepSubpath: true,
  },
})
```

默认值为 `false`。

### `deps.onlyBundle`

`onlyBundle` 选项作为允许从 `node_modules` 中打包的依赖白名单。如果有任何不在列表中的依赖被打包，tsdown 将抛出错误。这对于防止意外的依赖被静默内联到输出文件中非常有用，尤其是在大型项目中可能存在许多依赖的情况下。

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    onlyBundle: ['cac', 'bumpp'],
  },
})
```

在此示例中，只有 `cac` 和 `bumpp` 允许被打包。如果引入了任何其他 `node_modules` 依赖，tsdown 将抛出错误，指出哪个依赖被意外打包以及哪些文件引用了它。

#### 行为

- **`onlyBundle` 为数组**（例如 `['cac', /^my-/]`）：只有匹配列表的依赖才允许被打包，其他依赖会触发错误。列表中未使用的模式也会被报告。
- **`onlyBundle` 为 `false`**：抑制所有关于打包依赖的警告和检查。
- **`onlyBundle` 未设置**（默认）：如果有 `node_modules` 依赖被打包，会显示一条警告，建议您添加 `onlyBundle` 选项或将其设置为 `false` 来抑制警告。

::: tip
请确保在 `onlyBundle` 中包含所有子依赖，不仅是直接导入的顶层包。
:::

### `deps.onlyImport`

`onlyBundle` 控制哪些依赖允许被**打包**，而 `onlyImport` 选项则作为产物在运行时允许**导入**的依赖白名单。每次构建后，tsdown 会扫描生成的 chunk，如果其中导入了不在列表中的包，将抛出错误。这可以确保您发布的代码不会依赖任何未经明确批准的包。

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    onlyImport: ['cac'],
  },
})
```

在此示例中，产物只允许导入 `cac`。如果任何 chunk 导入了其他包，tsdown 将抛出错误并一次性列出所有违规导入，并建议您将它们添加到 `onlyImport`，或通过 `alwaysBundle` 将其打包。

#### 行为

- 匹配基于**包名**，因此列出 `cac` 即可覆盖 `cac/deno` 这类子路径导入。
- 当 `platform` 为 `node` 时，Node.js 内置模块始终允许被导入。
- 代码分割产生的 chunk 之间的相互导入始终允许。
- 类型声明产物（`.d.ts`）同样会被检查。

::: warning
会检查 ES 导入和动态 `import()` 表达式。CJS `require()` 调用不会被检测。
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

#### 外部化所有依赖

将 `neverBundle` 设置为 `true` 可以将**所有**依赖外部化：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    neverBundle: true,
  },
})
```

启用后，所有符合 npm 包名规范的导入（例如 `lodash`、`@scope/pkg/utils`）都会**按原样标记为外部依赖，不会进行解析**。这比已废弃的 `skipNodeModulesBundle` 选项更快，即使依赖没有安装也能正常工作。请注意以下行为：

- 包说明符会按原样保留；`my-dep/utils` 这类子路径不会被改写，`resolveDepSubpath` 选项不生效。
- 其他非相对导入——以 `#` 开头的[子路径导入](https://nodejs.org/api/packages.html#subpath-imports)和 `~/utils` 这类路径别名——仍会被解析：如果解析结果位于 `node_modules` 中，则保留原始说明符并外部化；否则打包解析到的本地文件。

与已废弃的 `skipNodeModulesBundle` 选项不同，`neverBundle: true` 可以与 `alwaysBundle` 组合使用，在外部化其他所有依赖的同时打包少数指定依赖：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    neverBundle: true,
    alwaysBundle: ['some-package'],
  },
})
```

### `deps.alwaysBundle`

`alwaysBundle` 选项允许您强制将某些依赖打包，即使它们被列为 `dependencies`、`peerDependencies` 或 `optionalDependencies`。例如：

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

| 废弃选项                     | 新选项                   |
| ---------------------------- | ------------------------ |
| `external`                   | `deps.neverBundle`       |
| `noExternal`                 | `deps.alwaysBundle`      |
| `inlineOnly`                 | `deps.onlyBundle`        |
| `skipNodeModulesBundle`      | `deps.neverBundle: true` |
| `deps.skipNodeModulesBundle` | `deps.neverBundle: true` |

## 总结

- **默认行为**：
  - `dependencies`、`peerDependencies` 和 `optionalDependencies` 被视为外部依赖，不会被打包。
  - `devDependencies` 和幻影依赖只有在代码中实际使用时才会被打包。
- **自定义**：
  - 使用 `deps.onlyBundle` 设置允许被打包的依赖白名单，不在列表中的依赖会触发错误。
  - 使用 `deps.onlyImport` 设置产物在运行时允许导入的包白名单。
  - 使用 `deps.neverBundle` 将特定依赖标记为外部依赖，或将其设置为 `true` 外部化所有依赖。
  - 使用 `deps.alwaysBundle` 强制将特定依赖打包。
  - 启用 `deps.resolveDepSubpath` 可将外部依赖的子路径导入解析为包内的相对路径。
- **声明文件**：
  - 声明文件的打包逻辑与 JavaScript 保持一致。
  - 使用 `resolver: 'tsc'` 可提升复杂第三方类型的兼容性。

通过理解和自定义依赖处理，您可以确保您的库在体积和可用性方面都得到优化。
