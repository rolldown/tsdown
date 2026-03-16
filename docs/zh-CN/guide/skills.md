# 与 AI 协作

tsdown 为 AI 编程助手提供了官方 [skills](https://agentskills.io/)，帮助 AI 理解 tsdown 的配置、功能和最佳实践，从而更好地协助你构建库。

## 安装

将所有 tsdown skills 安装到你的 AI 编程助手中：

```bash
npx skills add rolldown/tsdown
```

或者只安装特定的 skill：

```bash
npx skills add rolldown/tsdown --skill tsdown          # 仅安装 tsdown skill
npx skills add rolldown/tsdown --skill tsdown-migrate   # 仅安装迁移 skill
```

skills 的源码在[这里](https://github.com/rolldown/tsdown/tree/main/skills)。

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

## 迁移 Skill

安装 `rolldown/tsdown` 时已包含迁移 skill。你也可以单独安装：

```bash
npx skills add rolldown/tsdown --skill tsdown-migrate
```

该 skill 教会 AI 如何执行 tsup→tsdown 迁移，提供以下知识：

- tsup 和 tsdown 之间的完整选项映射
- 默认值差异及如何保留 tsup 行为
- 不支持的选项及其替代方案
- package.json 迁移规则（依赖、脚本、配置字段）
- 迁移后可推荐的 tsdown 独有新特性

### 示例提示词

```
将我的 tsup 项目迁移到 tsdown
```

```
把我的 tsup.config.ts 转换为 tsdown 格式
```

```
tsup 和 tsdown 的选项有什么区别？
```

迁移 skill 的源码在[这里](https://github.com/rolldown/tsdown/tree/main/skills/tsdown-migrate)。

## 包含的内容

tsdown skill 涵盖以下知识：

- 配置文件格式、选项和 workspace 支持
- 入口文件、输出格式和类型声明
- 依赖处理和自动外部化
- 框架支持（React、Vue、Solid、Svelte）
- 插件、钩子和编程 API
- CLI 命令和使用方式
