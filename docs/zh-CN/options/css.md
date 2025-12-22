# CSS

配置构建输出的 CSS 生成选项。

## 选项

### `splitting`

启用/禁用 CSS 代码拆分。

- **类型**: `boolean`
- **默认值**: `true`

当为 `true` 时，异步 JS chunks 中导入的 CSS 会保留为独立的 chunks。当为 `false` 时，所有 CSS 会合并到一个文件中。

### `fileName`

当代码拆分被禁用时，指定 CSS 文件的名称。

- **类型**: `string`
- **默认值**: `'style.css'`

仅在 `splitting` 为 `false` 时生效。

## 示例

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  css: {
    splitting: false, // 将所有 CSS 合并到一个文件
    fileName: 'index.css', // 可选：自定义 CSS 文件名
  },
})
```

默认情况下（`splitting: true`），CSS 代码拆分会被保留。禁用后，所有 CSS 会合并到一个文件中（默认为 `style.css` 或指定的 `fileName`）。
