# CI 环境支持

tsdown 能够自动检测 CI 环境，并允许你根据构建是在本地还是在 CI 中运行来启用或禁用特定功能。

## CI 检测

tsdown 使用 [`is-in-ci`](https://www.npmjs.com/package/is-in-ci) 包来检测 CI 环境，支持所有主流 CI 服务商，包括 GitHub Actions、GitLab CI、Jenkins、CircleCI、Travis CI 等。

## CI 感知选项

多个选项支持通过 `'ci-only'` 和 `'local-only'` 值实现 CI 感知行为：

| 值             | 行为                     |
| -------------- | ------------------------ |
| `true`         | 始终启用                 |
| `false`        | 始终禁用                 |
| `'ci-only'`    | 仅在 CI 中启用，本地禁用 |
| `'local-only'` | 仅在本地启用，CI 中禁用  |

### 支持的选项

以下选项接受 CI 感知值：

- [`dts`](/zh-CN/options/dts) — TypeScript 声明文件生成
- [`publint`](/zh-CN/options/lint) — 包规范校验
- [`attw`](/zh-CN/options/lint) — "Are the types wrong" 类型校验
- `report` — 构建产物体积报告
- [`exports`](/zh-CN/options/package-exports) — 自动生成 `package.json` exports 字段
- `unused` — 未使用依赖检查
- `devtools` — DevTools 集成
- `failOnWarn` — 遇警告时失败（默认值为 `false`）

### 基本用法

直接传递 CI 选项字符串：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // 仅在本地生成声明文件（CI 中跳过以加快构建速度）
  dts: 'local-only',
  // 仅在 CI 中运行 publint
  publint: 'ci-only',
  // 仅在 CI 中遇警告时失败（默认值为 false）
  failOnWarn: 'ci-only',
})
```

### 对象形式

当选项接受配置对象时，可以将 `enabled` 属性设置为 CI 感知值：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: {
    enabled: 'ci-only',
    level: 'error',
  },
  attw: {
    enabled: 'ci-only',
    profile: 'node16',
  },
})
```

## 配置函数

配置函数在其上下文中接收 `ci` 布尔值，允许动态配置：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig((_, { ci }) => ({
  minify: ci,
  sourcemap: !ci,
}))
```

## 示例：CI 流水线

一个典型的 CI 优化配置：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  dts: true,
  // 在 CI 中遇警告时失败（默认值为 false）
  failOnWarn: 'ci-only',
  // 在 CI 中运行包校验工具
  publint: 'ci-only',
  attw: 'ci-only',
})
```
