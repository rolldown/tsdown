# 编程方式使用

你可以在 JavaScript 或 TypeScript 代码中直接调用 `tsdown`，适用于自定义构建脚本、集成或自动化场景。

## 示例

```ts twoslash
import { build } from 'tsdown'

await build({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  // ...其他选项
})
```

所有 CLI 选项都可以作为参数对象的属性传递。完整选项请参见 [配置选项](../reference/api/Interface.Options.md)。
