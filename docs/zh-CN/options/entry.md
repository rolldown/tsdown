# 入口文件

`entry` 选项用于指定项目的入口文件。这些文件是打包过程的起点。您可以通过 CLI 或配置文件来定义入口文件。

## 使用 CLI

在使用 CLI 时，可以直接将入口文件作为命令参数指定。例如：

```bash
tsdown src/entry1.ts src/entry2.ts
```

此命令会将 `src/entry1.ts` 和 `src/entry2.ts` 分别打包为独立的入口点。

## 使用配置文件

在配置文件中，`entry` 选项支持多种格式来定义入口文件：

### 单个入口文件

可以将单个入口文件指定为字符串：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
})
```

### 多个入口文件

可以将多个入口文件指定为字符串数组：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/entry1.ts', 'src/entry2.ts'],
})
```

### 带别名的入口文件

可以使用对象来定义带别名的入口文件。对象的键表示别名，值表示文件路径：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    main: 'src/index.ts',
    utils: 'src/utils.ts',
  },
})
```

此配置会生成两个打包文件：`src/index.ts`（输出为 `dist/main.js`）和 `src/utils.ts`（输出为 `dist/utils.js`）。

## 使用 Glob 模式

`entry` 选项支持 [glob 模式](https://code.visualstudio.com/docs/editor/glob-patterns)，可以动态匹配多个文件。例如：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/**/*.ts',
})
```

此配置会将 `src` 目录及其子目录中的所有 `.ts` 文件作为入口点。

在数组中也可以使用 glob 模式，并通过否定模式排除特定文件：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/*.ts', '!src/*.test.ts'],
})
```

### 对象入口与 Glob 模式

使用对象形式时，键和值都可以使用 glob 通配符（`*`）。键中的 `*` 会被匹配到的文件名（不含扩展名）替换：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    // 将 src/foo.ts → dist/lib/foo.js，src/bar.ts → dist/lib/bar.js
    'lib/*': 'src/*.ts',
  },
})
```

这在需要输出结构与源码目录结构不同时非常有用。

#### 否定模式

使用 glob 键时，值可以是一个模式数组，包含否定模式（以 `!` 为前缀）来排除特定文件：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    // 包含所有 hooks，但排除 index 文件
    'hooks/*': ['src/hooks/*.ts', '!src/hooks/index.ts'],
  },
})
```

#### 多模式组合

可以同时组合多个匹配模式和多个否定模式：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'utils/*': [
      'src/utils/*.ts',
      'src/utils/*.tsx',
      '!src/utils/index.ts',
      '!src/utils/internal.ts',
    ],
  },
})
```

> [!WARNING]
> 在数组值中使用多个匹配模式时，所有模式必须具有相同的基础目录。例如，在同一个入口键中混合 `src/hooks/*.ts` 和 `src/utils/*.ts` 会抛出错误。

#### 混合入口

可以在数组中混合使用字符串、glob 模式和对象入口：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/*',
    '!src/foo.ts',
    { main: 'index.ts' },
    { 'lib/*': ['src/*.ts', '!src/bar.ts'] },
  ],
})
```

当数组入口和对象入口出现相同的输出名时，对象入口优先。

> [!TIP]
>
> 在 **Windows** 系统中，使用通配符模式（glob pattern）时，文件路径必须使用正斜杠（`/`），而不能使用反斜杠（`\`）。
