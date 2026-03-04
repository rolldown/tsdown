# CSS 支持

`tsdown` 的 CSS 支持目前仍处于实验阶段。虽然已覆盖主要使用场景，但 API 和行为在未来版本中可能会发生变化。

> [!WARNING] 实验性功能
> CSS 支持属于实验性特性。请务必充分测试，并反馈您遇到的任何问题。随着功能的完善，API 和行为可能会有所调整。

## 基础与高级 CSS

`tsdown` 提供两个层级的 CSS 支持：

- **内置（基础）：** CSS 文件提取和打包开箱即用，无需额外依赖。
- **高级（`@tsdown/css`）：** 预处理器（Sass/Less/Stylus）、CSS 语法降级、压缩和 `@import` 内联需要安装 `@tsdown/css` 包：

```bash
npm install -D @tsdown/css
```

安装 `@tsdown/css` 后，高级 CSS 插件会自动替代内置的基础插件。

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

## CSS 预处理器

> [!NOTE]
> 需要安装 `@tsdown/css`。

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

> [!NOTE]
> 需要安装 `@tsdown/css`。

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

> [!NOTE]
> 需要安装 `@tsdown/css`。

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

## Lightning CSS

> [!NOTE]
> 需要安装 `@tsdown/css`。

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

| 选项                      | 类型                          | 默认值          | 描述                                                      |
| ------------------------- | ----------------------------- | --------------- | --------------------------------------------------------- |
| `css.splitting`           | `boolean`                     | `false`         | 启用按 chunk 的 CSS 代码分割                              |
| `css.fileName`            | `string`                      | `'style.css'`   | 合并 CSS 的文件名（当 `splitting: false` 时）             |
| `css.minify`              | `boolean`                     | `false`         | 启用 CSS 压缩（需要 `@tsdown/css`）                       |
| `css.target`              | `string \| string[] \| false` | _继承 `target`_ | CSS 专用语法降级目标（需要 `@tsdown/css`）                |
| `css.preprocessorOptions` | `object`                      | —               | CSS 预处理器选项（需要 `@tsdown/css`）                    |
| `css.lightningcss`        | `object`                      | —               | 传递给 Lightning CSS 的语法降级选项（需要 `@tsdown/css`） |
