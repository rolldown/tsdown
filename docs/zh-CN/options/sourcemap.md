# 源映射（Source Map）

源映射是连接原始开发代码与在浏览器或其他环境中运行的优化代码的桥梁，大大简化了调试过程。它允许您将错误和日志追溯到原始的源文件，即使代码已经被压缩或打包。

例如，源映射可以帮助您定位 React 或 Vue 组件中导致错误的具体代码行，即使运行环境只能看到打包或压缩后的代码。

### 启用源映射

您可以通过使用 `--sourcemap` 选项指示 `tsdown` 生成源映射：

```bash
tsdown --sourcemap
```

请注意，如果您在 `tsconfig.json` 中启用了 [`declarationMap`](https://www.typescriptlang.org/tsconfig/#declarationMap) 选项，则 source map 将始终启用。
