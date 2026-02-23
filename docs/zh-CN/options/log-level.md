# 日志级别

在打包过程中控制日志的详细程度，有助于您专注于最重要的信息。推荐在 `tsdown` 中使用 `--log-level` 选项来管理日志输出。

## 用法

如果要屏蔽所有日志（包括错误），请将日志级别设置为 `silent`：

```bash
tsdown --log-level silent
```

如果只显示错误信息，请将日志级别设置为 `error`：

```bash
tsdown --log-level error
```

这对于 CI/CD 流水线或需要极简控制台输出的场景非常有用。

## 可用日志级别

- `silent`：不显示任何日志，包括错误。
- `error`：仅显示错误信息。
- `warn`：显示警告和错误信息。
- `info`：显示信息、警告和错误（默认）。

根据您的工作流选择合适的日志级别，以控制构建过程中显示的信息量。

## 警告时失败

`failOnWarn` 选项控制警告是否会导致构建以非零退出码退出。默认值为 `'ci-only'`，这意味着**在 CI 环境中，警告会导致构建失败**，但在本地开发时不会。

这种默认行为确保 CI 流水线能够发现潜在问题，同时不会影响本地开发体验。

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 默认：仅在 CI 中遇警告时失败
  failOnWarn: 'ci-only',
  // 始终在遇到警告时失败
  // failOnWarn: true,
  // 从不在遇到警告时失败
  // failOnWarn: false,
})
```

详见 [CI 环境](/zh-CN/advanced/ci) 了解更多 CI 感知选项。
