# 源映射（Source Map）

源映射是连接原始开发代码与在浏览器或其他环境中运行的优化代码的桥梁，大大简化了调试过程。它允许您将错误和日志追溯到原始的源文件，即使代码已经被压缩或打包。

例如，源映射可以帮助您定位 React 或 Vue 组件中导致错误的具体代码行，即使运行环境只能看到打包或压缩后的代码。

## 启用源映射

您可以通过使用 `--sourcemap` 选项指示 `tsdown` 生成源映射：

```bash
tsdown --sourcemap
```

或在配置文件中：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  sourcemap: true,
})
```

> [!NOTE]
> 如果您在 `tsconfig.json` 中启用了 [`declarationMap`](https://www.typescriptlang.org/tsconfig/#declarationMap) 选项，则 source map 将始终启用。

## Source Map 模式

`sourcemap` 选项接受以下值：

| 值         | 说明                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `false`    | 禁用源映射（默认）                                                                                                                                                                         |
| `true`     | 在输出文件旁生成独立的 `.map` 文件。输出文件末尾会附加 `//# sourceMappingURL` 注释指向 `.map` 文件。                                                                                       |
| `'inline'` | 将源映射以 base64 编码的 data URL 形式直接嵌入输出文件中。不会生成独立的 `.map` 文件。类似于 TypeScript 的 [`inlineSourceMap`](https://www.typescriptlang.org/tsconfig/#inlineSourceMap)。 |
| `'hidden'` | 生成独立的 `.map` 文件，但**不**在输出文件末尾附加 `//# sourceMappingURL` 注释。适用于希望为错误监控服务提供源映射，但不希望浏览器自动加载的场景。                                         |

### 使用 CLI

```bash
# 启用源映射（生成独立的 .map 文件）
tsdown --sourcemap

# 内联源映射
tsdown --sourcemap inline

# 隐藏源映射
tsdown --sourcemap hidden
```

### 使用配置文件

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 将源映射内联到输出文件中
  sourcemap: 'inline',
})
```

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 生成 .map 文件但不添加 sourceMappingURL 注释
  sourcemap: 'hidden',
})
```
