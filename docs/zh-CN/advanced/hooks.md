# 钩子（Hooks）

受 [unbuild](https://github.com/unjs/unbuild) 的启发，`tsdown` 支持一个灵活的钩子系统，允许您扩展和自定义构建过程。虽然我们推荐使用 [插件系统](./plugins.md) 来处理大多数与构建相关的扩展，但钩子提供了一种便捷的方式，可以在构建生命周期的特定阶段注入 Rolldown 插件或执行额外任务。

## 使用方法

您可以通过两种方式在配置文件中定义钩子：

### 传递对象

将钩子定义为一个对象，其中每个键是钩子名称，值是一个函数：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  hooks: {
    'build:done': async () => {
      await doSomething()
    },
  },
})
```

### 传递函数

或者，您可以传递一个接收钩子对象的函数，从而以编程方式注册钩子：

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  hooks(hooks) {
    hooks.hook('build:prepare', () => {
      console.log('Hello World')
    })
  },
})
```

有关如何使用钩子的更多详细信息，请参阅 [hookable](https://github.com/unjs/hookable) 文档。

## 可用钩子

有关详细的类型定义，请参阅 [`src/features/hooks.ts`](https://github.com/rolldown/tsdown/blob/main/src/features/hooks.ts)。

### `build:prepare`

在每次 tsdown 构建开始之前调用。使用此钩子执行设置或准备任务。

### `build:before`

在每次 Rolldown 构建之前调用。对于双格式构建，此钩子会为每种格式调用一次。适用于在打包之前配置或修改构建上下文。

### `build:done`

在每次 tsdown 构建完成后调用。使用此钩子执行清理或后处理任务。
