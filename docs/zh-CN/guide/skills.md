# 与 AI 协作

tsdown 为 AI 编程助手提供了官方 [skills](https://github.com/anthropics/claude-code/blob/main/docs/skills.md)，帮助 AI 理解 tsdown 的配置、功能和最佳实践，从而更好地协助你构建库。

## 安装

将 tsdown skill 安装到你的 AI 编程助手中：

```bash
npx skills add rolldown/tsdown
```

skill 的源码在[这里](https://github.com/rolldown/tsdown/tree/main/skills/tsdown)。

## 示例提示词

安装后，你可以让 AI 帮助完成各种 tsdown 相关的任务：

```
用 tsdown 构建 TypeScript 库，输出 ESM 和 CJS 格式
```

```
配置 tsdown 生成类型声明文件并打包为浏览器格式
```

```
为 tsdown 配置添加 React 支持和 Fast Refresh
```

```
用 tsdown 的 workspace 支持搭建 monorepo 构建
```

## 包含的内容

tsdown skill 涵盖以下知识：

- 配置文件格式、选项和 workspace 支持
- 入口文件、输出格式和类型声明
- 依赖处理和自动外部化
- 框架支持（React、Vue、Solid、Svelte）
- 插件、钩子和编程 API
- CLI 命令和使用方式
