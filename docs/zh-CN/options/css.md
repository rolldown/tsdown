# CSS

配置构建输出的 CSS 生成选项。

默认情况下（`splitting: true`），CSS 代码拆分会被保留。禁用后，所有 CSS 会合并到一个文件中（默认为 `style.css` 或指定的 `fileName`）。

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  css: {
    splitting: false, // 将所有 CSS 合并到一个文件
    fileName: 'index.css', // 可选：自定义 CSS 文件名
  },
})
```
