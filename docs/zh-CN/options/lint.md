# 包校验（publint 和 attw）

tsdown 集成了 [publint](https://publint.dev/) 和 [Are the types wrong?](https://arethetypeswrong.github.io/)（attw），用于在发布前校验你的包。这些工具可以检查 `package.json` 配置和类型定义中的常见问题。

## 安装

两个工具都是**可选依赖** —— 仅在需要使用时安装：

::: code-group

```bash [publint]
npm install -D publint
```

```bash [attw]
npm install -D @arethetypeswrong/core
```

```bash [同时安装]
npm install -D publint @arethetypeswrong/core
```

:::

## publint

[publint](https://publint.dev/) 检查你的包是否正确配置以供发布。它会验证 `package.json` 中的 `exports`、`main`、`module`、`types` 等字段与实际输出文件是否一致。

### 启用 publint

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: true,
})
```

### 配置

直接传递选项来自定义 publint 的行为：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: {
    level: 'error', // 'warning' | 'error' | 'suggestion'
  },
})
```

### CLI

```bash
tsdown --publint
```

## attw（Are the types wrong?）

[attw](https://arethetypeswrong.github.io/) 验证你的 TypeScript 声明文件在不同模块解析策略（`node10`、`node16`、`bundler`）下是否正确。它能捕获错误的 ESM/CJS 类型声明等问题，这些问题可能导致使用者遇到运行时错误。

### 启用 attw

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  attw: true,
})
```

### 配置

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  attw: {
    // 解析配置：
    //   'strict'   - 要求所有解析方式通过（默认）
    //   'node16'   - 忽略 node10 解析失败
    //   'esm-only' - 忽略 CJS 解析失败
    profile: 'node16',

    // 级别：'warn'（默认）或 'error'（导致构建失败）
    level: 'error',

    // 忽略特定的问题类型
    ignoreRules: ['false-cjs', 'cjs-resolves-to-esm'],
  },
})
```

### 配置（Profiles）

| 配置       | 说明                                   |
| ---------- | -------------------------------------- |
| `strict`   | 要求所有解析方式通过（默认）           |
| `node16`   | 忽略 `node10` 解析失败                 |
| `esm-only` | 忽略 `node10` 和 `node16-cjs` 解析失败 |

### 忽略规则

你可以通过 `ignoreRules` 来抑制特定的问题类型：

| 规则                        | 说明                        |
| --------------------------- | --------------------------- |
| `no-resolution`             | 模块无法解析                |
| `untyped-resolution`        | 解析成功但没有类型          |
| `false-cjs`                 | 类型标注为 CJS 但实现是 ESM |
| `false-esm`                 | 类型标注为 ESM 但实现是 CJS |
| `cjs-resolves-to-esm`       | CJS 解析指向 ESM 模块       |
| `fallback-condition`        | 使用了 fallback/通配符条件  |
| `cjs-only-exports-default`  | CJS 模块仅导出默认值        |
| `named-exports`             | 类型与实现的命名导出不匹配  |
| `false-export-default`      | 类型声明了不存在的默认导出  |
| `missing-export-equals`     | CJS 类型缺少 `export =`     |
| `unexpected-module-syntax`  | 文件使用了意外的模块语法    |
| `internal-resolution-error` | 类型检查中的内部解析错误    |

### CLI

```bash
tsdown --attw
```

## CI 集成

`publint` 和 `attw` 都支持 [CI 感知选项](/zh-CN/advanced/ci)。这适用于仅在 CI 中运行包校验：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: 'ci-only',
  attw: {
    enabled: 'ci-only',
    profile: 'node16',
    level: 'error',
  },
})
```

> [!NOTE]
> 两个工具都需要项目目录中存在 `package.json`。如果未找到 `package.json`，会记录警告并跳过检查。
