# 复制文件

`copy` 选项用于将静态文件和目录复制到构建输出中。它适合处理不需要经过打包器转换、但需要随包一起发布的资源，例如图片、字体和许可证文件。

## 使用 CLI

将目录传给 `--copy`，即可把它复制到输出目录：

```bash
tsdown --copy public
```

当 `outDir` 使用默认值 `dist` 时，`public/favicon.svg` 会被复制到 `dist/public/favicon.svg`。

## 使用配置文件

最简单的配置是一个路径或 glob 模式：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: 'public',
})
```

您可以在数组中指定多个路径、glob 模式或对象配置：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: [
    'LICENSE',
    {
      from: ['public/**/*', '!public/**/*.map'],
      to: 'dist/assets',
      flatten: false,
    },
  ],
})
```

glob 模式支持使用 `!` 前缀进行排除。在此示例中，`public` 下的文件会复制到 `dist/assets` 并保留相对目录结构，同时排除源映射文件。

> [!NOTE]
> 相对的源路径和目标路径都基于项目根目录（`cwd`）解析，而不是基于 `outDir`。

## 对象选项

对象配置支持以下属性：

| 属性      | 类型                                                | 默认值   | 说明                                                                           |
| --------- | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `from`    | `string \| string[]`                                | 必填     | 源路径或 glob 模式。数组中可以包含否定模式。                                   |
| `to`      | `string`                                            | `outDir` | 目标路径，基于项目根目录解析。                                                 |
| `flatten` | `boolean`                                           | `true`   | 将匹配的文件直接放入 `to`。设为 `false` 时，会保留第一个路径段之后的目录结构。 |
| `rename`  | `string \| ((name, extension, fullPath) => string)` | —        | 修改目标名称。回调接收不带前导点的扩展名和绝对路径。                           |
| `verbose` | `boolean`                                           | `false`  | 记录每个复制操作的源路径和目标路径。                                           |

### 保留目录结构

默认情况下，glob 匹配到的文件会被直接放入目标目录。设置 `flatten: false` 可以保留其相对目录结构：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: {
    from: 'assets/**/*',
    to: 'dist/public',
    flatten: false,
  },
})
```

例如，`assets/fonts/inter.woff2` 会被复制到 `dist/public/fonts/inter.woff2`。

### 重命名复制项

使用字符串或回调可以重命名复制项：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: [
    {
      from: 'src/file.txt',
      to: 'dist',
      rename: 'file.md',
    },
    {
      from: 'src/file.txt',
      to: 'dist',
      rename: (name, extension) => `${name}-renamed.${extension}`,
    },
  ],
})
```

此配置会生成 `dist/file.md` 和 `dist/file-renamed.txt`。

## 动态配置

`copy` 也可以是同步或异步回调。回调接收解析后的 tsdown 配置，并返回相同的字符串、对象或数组形式：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: ({ outDir }) => ({
    from: ['assets/**/*', '!assets/**/*.map'],
    to: `${outDir}/assets`,
    flatten: false,
  }),
})
```

## 构建和监听行为

复制操作会在打包输出生成后运行，静态文件不会经过 Rolldown 转换。对于多格式构建，顶层 `copy` 选项只运行一次；特定格式的覆盖配置可以为该格式再次定义 `copy`。

在监听模式下，匹配到的源文件会被作为构建依赖进行监听。文件发生变化时会触发重新构建，并再次复制当前文件。
