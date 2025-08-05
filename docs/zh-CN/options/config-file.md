# 配置文件

默认情况下，`tsdown` 会在当前工作目录中查找配置文件，并向上遍历父目录直到找到一个配置文件。它支持以下文件名：

- `tsdown.config.ts`
- `tsdown.config.mts`
- `tsdown.config.cts`
- `tsdown.config.js`
- `tsdown.config.mjs`
- `tsdown.config.cjs`
- `tsdown.config.json`
- `tsdown.config`

此外，您还可以直接在 `package.json` 文件的 `tsdown` 字段中定义配置。

## 编写配置文件

配置文件允许您以集中且可复用的方式定义和自定义构建设置。以下是一个简单的 `tsdown` 配置文件示例：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
})
```

### 构建多个输出

`tsdown` 还支持从配置文件返回一个**配置数组**。这允许您在一次运行中使用不同的设置构建多个输出。例如：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: 'src/entry1.ts',
    platform: 'node',
  },
  {
    entry: 'src/entry2.ts',
    platform: 'browser',
  },
])
```

## 指定自定义配置文件

如果您的配置文件位于其他位置或具有不同的名称，可以使用 `--config`（或 `-c`）选项指定其路径：

```bash
tsdown --config ./path/to/config
```

## 禁用配置文件 {#disable-config-file}

如果您希望完全禁用加载配置文件，可以使用 `--no-config` 选项：

```bash
tsdown --no-config
```

这在您希望仅依赖命令行选项或默认设置时非常有用。

## 扩展 Vite 或 Vitest 配置（实验性功能）{#extending-vite-or-vitest-config-experimental}

`tsdown` 提供了一个**实验性**功能，允许您扩展现有的 Vite 或 Vitest 配置文件。通过此功能，您可以复用特定的配置选项（如 `resolve` 和 `plugins`），同时忽略与 `tsdown` 无关的其他选项。

要启用此功能，请使用 `--from-vite` 选项：

```bash
tsdown --from-vite        # 加载 vite.config.*
tsdown --from-vite vitest # 加载 vitest.config.*
```

> [!WARNING]
> 此功能为 **实验性功能**，可能并不支持所有 Vite 或 Vitest 的配置选项。仅特定选项（如 `resolve` 和 `plugins`）会被重用。请谨慎使用，并在您的项目中充分测试。

> [!TIP]
> 如果您的项目已经使用了 Vite 或 Vitest，扩展其配置可以节省时间和精力，让您在现有设置的基础上构建，而无需重复配置。

## 参考

有关可用配置选项的完整列表，请参阅 [配置选项参考](../reference/api/Interface.Options.md)。其中包括所有支持字段及其用法的详细说明。
