# 输出格式

默认情况下，`tsdown` 会生成 [ESM](https://nodejs.org/api/esm.html)（ECMAScript 模块）格式的 JavaScript 代码。不过，您可以通过 `--format` 选项指定所需的输出格式：

```bash
tsdown --format esm # 默认
```

## 可用格式

- [`esm`](https://nodejs.org/api/esm.html)：ECMAScript 模块格式，适用于包括浏览器和 Node.js 在内的现代 JavaScript 环境。
- [`cjs`](https://nodejs.org/api/modules.html)：CommonJS 格式，常用于 Node.js 项目。
- [`iife`](https://developer.mozilla.org/zh-CN/docs/Glossary/IIFE)：立即调用函数表达式，适合嵌入 `<script>` 标签或独立的浏览器使用场景。
- [`umd`](https://github.com/umdjs/umd)：通用模块定义（Universal Module Definition），一种兼容 AMD、CommonJS 以及全局变量的模块格式。

### 示例

```bash
# 生成 ESM 格式输出（默认）
tsdown --format esm

# 同时生成 ESM 和 CJS 格式输出
tsdown --format esm --format cjs

# 生成适用于浏览器的 IIFE 格式输出
tsdown --format iife
```

> [!TIP]
> 您可以在单个命令中指定多个格式，以生成适用于不同环境的输出。例如，结合使用 `esm` 和 `cjs` 格式可以确保同时兼容现代和传统系统。

## 按格式覆盖配置

您可以在配置文件中将 `format` 设置为对象，从而为每种输出格式单独覆盖特定配置选项。这允许您为每个格式分别定制如 `target` 等设置。

```ts
export default defineConfig({
  entry: ['./src/index.js'],
  format: {
    esm: {
      target: ['es2015'],
    },
    cjs: {
      target: ['node20'],
    },
  },
})
```

在此示例中，ESM 输出将以 ES2015 为目标，CJS 输出将以 Node.js 20 为目标。通过这种方式，您可以对不同模块格式的构建过程进行精细化控制。

## CSS 代码拆分

默认情况下，CSS 代码拆分会被保留（`cssCodeSplit: true`），这意味着异步 JS chunks 中导入的 CSS 会保留为独立的 chunks。当设置为 `false` 时，项目中的所有 CSS 会合并到一个 `style.css` 文件中。

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  cssCodeSplit: false, // 将所有 CSS 合并到 style.css
})
```

**默认** (`cssCodeSplit: true`): 异步 JS chunks 中导入的 CSS 会保留为独立的 chunks。
**启用 `cssCodeSplit: false`**: 所有 CSS 会合并到一个 `style.css` 文件中，按照 chunk 依赖关系排序。
