# 自定义 Rolldown 选项

`tsdown` 使用 [Rolldown](https://rolldown.rs) 作为其核心打包引擎。这使您可以轻松地直接向 Rolldown 传递或覆盖选项，从而对打包过程进行细粒度的控制。

有关可用 Rolldown 选项的完整列表，请参阅 [Rolldown 配置选项](https://rolldown.rs/reference/config-options) 文档。

> [!WARNING]
> 您应当熟悉您所覆盖的 Rolldown 选项的行为，并确保已阅读 Rolldown 的相关文档。

## 覆盖 `inputOptions`

您可以覆盖 `tsdown` 生成的 `inputOptions`，以自定义 Rolldown 如何处理输入文件。有两种方式可以实现：

### 使用对象

您可以直接传递一个对象来覆盖特定的 `inputOptions`：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    cwd: './custom-directory',
  },
})
```

在此示例中，`cwd`（当前工作目录）选项被设置为 `./custom-directory`。

### 使用函数

或者，您可以使用一个函数动态修改 `inputOptions`。该函数接收生成的 `inputOptions` 和当前的 `format` 作为参数：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions(inputOptions, format) {
    inputOptions.cwd = './custom-directory'
    return inputOptions
  },
})
```

当您需要根据输出格式或其他动态条件自定义选项时，此方法非常有用。

## 覆盖 `outputOptions`

`outputOptions` 可以以与 `inputOptions` 相同的方式进行自定义。例如：

### 使用对象

您可以直接传递一个对象来覆盖特定的 `outputOptions`：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  outputOptions: {
    legalComments: 'inline',
  },
})
```

在此示例中，`legalComments: 'inline'` 选项确保法律注释（例如许可证头部）会保留在输出文件中。

### 使用函数

您还可以使用一个函数动态修改 `outputOptions`。该函数接收生成的 `outputOptions` 和当前的 `format` 作为参数：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  outputOptions(outputOptions, format) {
    if (format === 'esm') {
      outputOptions.legalComments = 'inline'
    }
    return outputOptions
  },
})
```

此方法确保仅对 `esm` 格式保留法律注释。

## 何时使用自定义选项

虽然 `tsdown` 直接暴露了许多常用选项，但在某些情况下，某些 Rolldown 选项可能未被暴露。在这种情况下，您可以使用 `inputOptions` 和 `outputOptions` 覆盖来直接在 Rolldown 中设置这些选项。

> [!TIP]
> 使用 `inputOptions` 和 `outputOptions` 可以完全访问 Rolldown 的强大配置系统，让您能够超越 `tsdown` 直接暴露的选项，自定义您的构建过程。
