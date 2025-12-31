# 自动生成包导出

`tsdown` 提供了一个实验性功能，可以自动推断并生成 `package.json` 中的 `exports`、`main`、`module` 和 `types` 字段。这有助于确保您的包导出始终与构建输出保持同步且正确。

## 启用自动导出

您可以在 `tsdown` 配置文件中设置 `exports: true` 来启用此功能：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: true,
})
```

这将自动分析您的入口文件和输出文件，并相应地更新您的 `package.json`。

> [!WARNING]
> 请在发布包之前仔细检查自动生成的字段，或开启 publint 以进行验证。

## 导出所有文件

默认情况下，仅导出入口文件。如果您希望导出所有文件（包括未列为入口的文件），可以启用 `exports.all` 选项：

```ts
export default defineConfig({
  exports: {
    all: true,
  },
})
```

这样会将所有相关文件包含在生成的 `exports` 字段中。

## 开发时源码链接

### 开发导出（Dev Exports） {#dev-exports}

在开发过程中，您可能希望 `exports` 字段直接指向源码文件，以便更好地调试和获得编辑器支持。可以通过设置 `exports.devExports` 为 `true` 来启用：

```ts
export default defineConfig({
  exports: {
    devExports: true,
  },
})
```

启用后，`package.json` 中生成的 `exports` 字段会链接到您的源码。构建产物的导出信息会写入 `publishConfig` 字段，在使用 `yarn` 或 `pnpm` 的 `pack`/`publish` 命令时会覆盖顶层的 `exports` 字段（注意：**npm 不支持此特性**）。

### 条件开发导出（Conditional Dev Exports）

您还可以将 `exports.devExports` 设置为字符串，仅在特定[条件](https://nodejs.org/api/packages.html#conditional-exports)下链接到源码：

```ts
export default defineConfig({
  exports: {
    devExports: 'development',
  },
})
```

这在结合 TypeScript 的 [`customConditions`](https://www.typescriptlang.org/tsconfig/#customConditions) 选项时尤其有用，可以灵活控制哪些条件下使用源码。

## CSS 导出

当 `css.splitting` 为 `false` 时，打包后的 CSS 文件会自动添加到 `exports` 中：

```ts
export default defineConfig({
  css: {
    splitting: false,
  },
  exports: true,
})
```

CSS 文件名默认为 `style.css`，可通过 `css.fileName` 自定义。

## 自定义导出

如果您需要对生成的导出字段进行更细致的控制，可以通过 `exports.customExports` 提供自定义函数：

```ts
export default defineConfig({
  exports: {
    customExports(pkg, context) {
      pkg['./foo'] = './foo.js'
      return pkg
    },
  },
})
```
