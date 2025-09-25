# 静默模式

> **已废弃**：`--silent` 选项已废弃，请使用 `--log-level silent` 替代。

如果您希望在打包过程中屏蔽非错误日志，可以通过使用 `--silent` 选项启用**静默模式**：

```bash
tsdown --silent
```

**推荐做法**，使用新的 `--log-level` 选项：

```bash
tsdown --log-level silent
```

在静默模式下，只有错误消息会被显示，这使您能够更专注于构建过程中的关键问题。
