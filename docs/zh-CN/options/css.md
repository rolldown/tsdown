# CSS 支持

`tsdown` 的 CSS 支持仍处于非常早期的实验阶段。虽然您可以使用一些基础功能，但请注意，相关 API 和行为在未来版本中可能会发生变化。

> [!WARNING] 实验性功能
> CSS 支持属于高度实验性特性。请务必充分测试，并反馈您遇到的任何问题。随着功能的完善，API 和行为可能会有所调整。

## 选项

### 禁用 CSS 代码分割

默认情况下，CSS 可能会根据入口文件被拆分为多个文件。如果您希望禁用 CSS 代码分割并生成单一 CSS 文件，可以在配置中将 `css.splitting` 设置为 `false`：

```ts
export default defineConfig({
  css: {
    splitting: false,
  },
})
```

### 设置输出 CSS 文件名

您可以通过 `css.fileName` 选项自定义合并后 CSS 文件的名称：

```ts
export default defineConfig({
  css: {
    fileName: 'my-library.css',
  },
})
```

这样会在输出目录下生成名为 `my-library.css` 的合并 CSS 文件。
