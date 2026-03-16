# CSS 支持

`tsdown` 的 CSS 支持目前仍处于实验阶段。虽然已覆盖主要使用场景，但 API 和行为在未来版本中可能会发生变化。

> [!WARNING] 实验性功能
> CSS 支持属于实验性特性。请务必充分测试，并反馈您遇到的任何问题。随着功能的完善，API 和行为可能会有所调整。

## 快速开始

`tsdown` 的所有 CSS 功能由 `@tsdown/css` 包提供。安装后即可启用 CSS 处理：

```bash
npm install -D @tsdown/css
```

安装 `@tsdown/css` 后，CSS 处理会自动启用。

## CSS 导入

支持在 TypeScript 或 JavaScript 入口文件中直接导入 `.css` 文件。CSS 内容会被提取并作为独立的 `.css` 资源文件输出：

```ts
// src/index.ts
import './style.css'

export function greet() {
  return 'Hello'
}
```

这会在输出目录下同时生成 `index.mjs` 和 `index.css`。

### `@import` 内联

安装 `@tsdown/css` 后，CSS `@import` 语句会被自动解析并内联到输出中。这意味着你可以使用 `@import` 将 CSS 拆分到多个文件中，而不会产生额外的输出文件：

```css
/* style.css */
@import './reset.css';
@import './theme.css';

.main {
  color: red;
}
```

所有被导入的 CSS 会被打包到单个输出文件中，`@import` 语句会被移除。

### 内联 CSS（`?inline`）

在 CSS 导入路径后添加 `?inline` 查询参数，可以将完全处理后的 CSS 作为 JavaScript 字符串返回，而不是输出为独立的 `.css` 文件。此行为与 [Vite 的 `?inline` 行为](https://vite.dev/guide/features#disabling-css-injection-into-the-page)保持一致：

```ts
import css from './theme.css?inline' // 返回处理后的 CSS 字符串
import './style.css' // 提取为 .css 文件
console.log(css) // ".theme { color: red; }\n"
```

`?inline` CSS 会经过完整的处理管线——预处理器、`@import` 内联、语法降级和压缩——与普通 CSS 完全一致。唯一的区别是输出格式：JavaScript 字符串导出而非 CSS 资源文件。

也支持预处理器文件：

```ts
import css from './theme.scss?inline'
```

使用 `?inline` 时，CSS 不会包含在输出的 `.css` 文件中，且该导入是可摇树的（`moduleSideEffects: false`）。

## CSS 预处理器

`tsdown` 内置支持 `.scss`、`.sass`、`.less`、`.styl` 和 `.stylus` 文件。需要安装对应的预处理器作为开发依赖：

::: code-group

```sh [Sass]
# sass-embedded（推荐，更快）或 sass 均可
npm install -D sass-embedded
# 或
npm install -D sass
```

```sh [Less]
npm install -D less
```

```sh [Stylus]
npm install -D stylus
```

:::

安装后即可直接导入预处理器文件：

```ts
import './style.scss'
import './theme.less'
import './global.styl'
```

### 预处理器选项

通过 `css.preprocessorOptions` 传递各预处理器的选项：

```ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `$brand-color: #ff7e17;`,
      },
      less: {
        math: 'always',
      },
    },
  },
})
```

#### `additionalData`

每个预处理器都支持 `additionalData` 选项，用于在每个处理文件的开头注入额外代码。适用于全局变量或 mixin：

```ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // 字符串 — 添加到每个 .scss 文件开头
        additionalData: `@use "src/styles/variables" as *;`,
      },
    },
  },
})
```

也可使用函数进行动态注入：

```ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (source, filename) => {
          if (filename.includes('theme')) return source
          return `@use "src/styles/variables" as *;\n${source}`
        },
      },
    },
  },
})
```

## CSS 压缩

通过 `css.minify` 启用 CSS 压缩：

```ts
export default defineConfig({
  css: {
    minify: true,
  },
})
```

压缩由 [Lightning CSS](https://lightningcss.dev/) 提供支持。

## CSS 目标

默认情况下，CSS 语法降级使用顶层的 [`target`](/zh-CN/options/target) 选项。你可以通过 `css.target` 单独为 CSS 设置目标：

```ts
export default defineConfig({
  target: 'node18',
  css: {
    target: 'chrome90', // CSS 专用目标
  },
})
```

设置 `css.target: false` 可以完全禁用 CSS 语法降级，即使设置了顶层 `target`：

```ts
export default defineConfig({
  target: 'chrome90',
  css: {
    target: false, // 保留现代 CSS 语法
  },
})
```

## CSS 转换器

`css.transformer` 选项控制 CSS 的处理方式。PostCSS 和 Lightning CSS 是**互斥的**处理路径：

- **`'lightningcss'`**（默认）：`@import` 由 Lightning CSS 的 `bundleAsync()` 解析，**完全不使用** PostCSS。
- **`'postcss'`**：`@import` 由 [`postcss-import`](https://github.com/postcss/postcss-import) 解析，PostCSS 插件被应用，然后 Lightning CSS 仅用于最终的语法降级和压缩。

```ts
export default defineConfig({
  css: {
    transformer: 'postcss', // 使用 PostCSS 处理 @import 和插件
  },
})
```

使用 `'postcss'` 转换器时，需安装 `postcss` 和可选的 `postcss-import` 用于 `@import` 解析：

```bash
npm install -D postcss postcss-import
```

### PostCSS 选项

可以内联配置 PostCSS 或指向配置文件：

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
    postcss: {
      plugins: [require('autoprefixer')],
    },
  },
})
```

或指定目录路径来搜索 PostCSS 配置文件（`postcss.config.js` 等）：

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
    postcss: './config', // 在 ./config/ 中搜索 postcss.config.js
  },
})
```

未设置 `css.postcss` 且 `transformer` 为 `'postcss'` 时，tsdown 会自动从项目根目录检测 PostCSS 配置。

## Lightning CSS

`tsdown` 使用 [Lightning CSS](https://lightningcss.dev/) 进行 CSS 语法降级——根据 `target` 设置将现代 CSS 特性转换为兼容旧版浏览器的语法。

要启用 CSS 语法降级，需安装 `lightningcss`：

::: code-group

```sh [npm]
npm install -D lightningcss
```

```sh [pnpm]
pnpm add -D lightningcss
```

```sh [yarn]
yarn add -D lightningcss
```

```sh [bun]
bun add -D lightningcss
```

:::

安装后，当设置了 `target` 时，CSS 降级会自动启用。例如，设置 `target: 'chrome108'` 时，CSS 嵌套 `&` 选择器会被展开：

```css
/* 输入 */
.foo {
  & .bar {
    color: red;
  }
}

/* 输出 (chrome108) */
.foo .bar {
  color: red;
}
```

### Lightning CSS 选项

通过 `css.lightningcss` 传递额外选项：

```ts
import { Features } from 'lightningcss'

export default defineConfig({
  css: {
    lightningcss: {
      // 直接覆盖浏览器目标（替代 `target` 选项）
      targets: { chrome: 100 << 16 },
      // 包含/排除特定功能
      include: Features.Nesting,
    },
  },
})
```

> [!TIP]
> 当设置了 `css.lightningcss.targets` 时，它会优先于顶层的 `target` 和 `css.target` 选项用于 CSS 转换。

更多可用选项请参考 [Lightning CSS 文档](https://lightningcss.dev/)。

## 保留 CSS 导入（`css.inject`）{#css-inject}

默认情况下，CSS 导入语句在提取为独立文件后会从 JS 输出中移除。启用 `css.inject` 后，JS 输出会保留指向生成的 CSS 文件的 `import` 语句，使库的使用者在导入 JS 时自动引入对应的 CSS：

```ts
export default defineConfig({
  css: {
    inject: true,
  },
})
```

启用 `css.inject: true` 后，输出的 JS 文件将包含：

```js
// dist/index.mjs
import './style.css'

export function greet() {
  return 'Hello'
}
```

这对于组件库非常有用，可以确保用户导入组件时自动包含对应的 CSS。

## CSS Modules

扩展名为 `.module.css` 的文件（以及预处理器变体如 `.module.scss`、`.module.less` 等）会被视为 [CSS Modules](https://github.com/css-modules/css-modules)。类名会自动添加作用域，并作为 JavaScript 对象导出：

```ts
// src/index.ts
import styles from './app.module.css'

console.log(styles.title) // "scoped_title_hash"
```

```css
/* app.module.css */
.title {
  color: red;
}
.content {
  font-size: 14px;
}
```

CSS 会以作用域化的类名输出，JS 输出导出原始类名到作用域化类名的映射。

### 配置

通过 `css.modules` 配置 CSS modules 行为：

```ts
export default defineConfig({
  css: {
    modules: {
      // 作用域行为：'local'（默认）或 'global'
      scopeBehaviour: 'local',

      // 作用域类名模式（Lightning CSS 模式语法）
      generateScopedName: '[hash]_[local]',

      // JS 导出中的类名转换约定
      localsConvention: 'camelCase',
    },
  },
})
```

设置 `css.modules: false` 可完全禁用 CSS modules——`.module.css` 文件将被视为普通 CSS。

### `localsConvention`

控制类名在 JavaScript 中的导出方式：

| 值                | 输入      | 导出                |
| ----------------- | --------- | ------------------- |
| _（未设置）_      | `foo-bar` | `foo-bar`           |
| `'camelCase'`     | `foo-bar` | `foo-bar`、`fooBar` |
| `'camelCaseOnly'` | `foo-bar` | `fooBar`            |
| `'dashes'`        | `foo-bar` | `foo-bar`、`fooBar` |
| `'dashesOnly'`    | `foo-bar` | `fooBar`            |

### `generateScopedName`

使用 `transformer: 'lightningcss'`（默认）时，接受 Lightning CSS [模式字符串](https://lightningcss.dev/css-modules.html#custom-naming-conventions)（如 `'[hash]_[local]'`）。

使用 `transformer: 'postcss'` 时，还支持函数形式：

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
    modules: {
      generateScopedName: (name, filename, css) => {
        return `my-lib_${name}`
      },
    },
  },
})
```

> [!NOTE]
> 函数形式的 `generateScopedName` 仅在 `transformer: 'postcss'` 时支持。Lightning CSS 转换器仅支持字符串模式。

### 可选依赖

使用 `transformer: 'postcss'` 配合 CSS modules 时，需安装 [`postcss-modules`](https://github.com/css-modules/postcss-modules)：

```bash
npm install -D postcss postcss-modules
```

## CSS 代码分割

### 合并模式（默认）

默认情况下，所有 CSS 会合并为单个文件（默认为 `style.css`）：

```
dist/
  index.mjs
  style.css  ← 所有 CSS 合并
```

### 自定义文件名

可以自定义合并 CSS 的文件名：

```ts
export default defineConfig({
  css: {
    fileName: 'my-library.css',
  },
})
```

### 分割模式

要按 chunk 分割 CSS——每个导入 CSS 的 JavaScript chunk 会有对应的 `.css` 文件——启用分割：

```ts
export default defineConfig({
  css: {
    splitting: true,
  },
})
```

```
dist/
  index.mjs
  index.css        ← index.ts 的 CSS
  async-abc123.mjs
  async-abc123.css ← 异步 chunk 的 CSS
```

## 选项参考

| 选项                      | 类型                          | 默认值           | 描述                                          |
| ------------------------- | ----------------------------- | ---------------- | --------------------------------------------- |
| `css.transformer`         | `'postcss' \| 'lightningcss'` | `'lightningcss'` | CSS 处理管线                                  |
| `css.splitting`           | `boolean`                     | `false`          | 启用按 chunk 的 CSS 代码分割                  |
| `css.fileName`            | `string`                      | `'style.css'`    | 合并 CSS 的文件名（当 `splitting: false` 时） |
| `css.minify`              | `boolean`                     | `false`          | 启用 CSS 压缩                                 |
| `css.modules`             | `object \| false`             | `{}`             | CSS modules 配置，或 `false` 禁用             |
| `css.target`              | `string \| string[] \| false` | _继承 `target`_  | CSS 专用语法降级目标                          |
| `css.postcss`             | `string \| object`            | —                | PostCSS 配置路径或内联选项                    |
| `css.preprocessorOptions` | `object`                      | —                | CSS 预处理器选项                              |
| `css.inject`              | `boolean`                     | `false`          | 在 JS 输出中保留 CSS 导入语句                 |
| `css.lightningcss`        | `object`                      | —                | 传递给 Lightning CSS 的语法降级选项           |
