# 监听模式

监听模式允许 `tsdown` 在检测到指定文件或目录的更改时自动重新打包代码。这在开发过程中非常有用，可以简化构建流程。

### 启用监听模式

您可以使用 `--watch`（或 `-w`）选项启用监听模式：

```bash
tsdown --watch
```

### 监听特定路径

默认情况下，`tsdown` 会监听项目中参与构建过程的文件。但您也可以指定自定义路径来监听更改：

```bash
tsdown --watch <path>
```

### 示例

```bash
# 监听项目中的所有文件（默认行为）
tsdown --watch

# 监听特定目录
tsdown --watch ./src

# 监听特定文件
tsdown --watch ./src/index.ts
```

> [!TIP]
> 监听模式非常适合开发工作流，因为它无需在每次更改后手动重新构建项目。

另请参阅[为什么 tsdown 不支持 Stub 模式](../guide/faq.md#stub-mode)，了解监听模式作为 stub 模式替代方案的背景。
