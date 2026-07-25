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

## 内存中的输出

设置 `write: false` 可以访问生成的代码块（chunk）和资源（asset），而不将打包产物写入磁盘：

```ts twoslash
import { build } from 'tsdown'

const bundles = await build({
  entry: ['src/index.ts'],
  format: 'esm',
  write: false,
  clean: false,
})

for (const bundle of bundles) {
  for (const output of bundle.chunks) {
    const contents = output.type === 'chunk' ? output.code : output.source
    console.log(output.fileName, contents)
  }
}
```

`build()` 当前返回 `TsdownBundle[]`，每个解析后的配置对应一个 bundle。即使只有单个配置，返回值也是数组；内存中的 Rolldown 输出位于 `bundle.chunks`。

`write` 选项控制 Rolldown 打包产物的写入，其他文件操作则单独配置。例如，`clean` 默认为 `true`，因此如果必须保留现有输出目录，请像上面的示例一样设置 `clean: false`。显式启用的 `copy` 或 `exports` 等功能仍可能写入文件。`write: false` 与监听模式不兼容。

所有 CLI 选项都可以作为参数对象的属性传递。完整选项请参见 [配置选项](../reference/api/Interface.UserConfig.md)。
