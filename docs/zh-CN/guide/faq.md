# 常见问题解答

## 为什么 tsdown 不支持 Stub 模式 {#stub-mode}

由于多方面的限制和设计考量，`tsdown` **不支持** stub 模式：

- **Stub 模式需要手动干预：**
  每当您更改命名导出时，都必须重新运行 stub 命令以更新 stub 文件。这会打断开发流程，并可能导致不一致。
- **Stub 模式与插件不兼容：**
  Stub 模式无法支持插件功能，而插件对于许多高级用例和自定义构建逻辑来说是必不可少的。

### 推荐替代方案

与 stub 模式相比，我们推荐更可靠、更灵活的方式：

1. **使用[监听模式](../options/watch-mode.md)：**
   最简单的方案是运行 `tsdown` 的监听模式。这样，每次修改代码时，构建都会自动更新，不过需要让进程在后台持续运行。

2. **使用 [`exports.devExports`](../options/package-exports.md#dev-exports) 实现开发/生产环境分离：**
   更高级且健壮的方案是使用 `exports.devExports` 选项，为开发和生产环境指定不同的导出路径。这样可以在开发时指向源码文件，生产时指向构建产物。
   - **如果您使用插件：**
     推荐使用 [vite-node](https://github.com/antfu-collective/vite-node) 直接运行代码，并支持插件。
   - **如果您不使用插件：**
     可以使用轻量级 TypeScript 运行器，如 [tsx](https://github.com/privatenumber/tsx)、[jiti](https://github.com/unjs/jiti) 或 [unrun](https://github.com/Gugustinette/unrun)。
   - **如果您不使用插件且代码兼容 Node.js 原生 TypeScript 支持：**
     在 Node.js v22.18.0 及以上版本，您可以直接运行 TypeScript 文件，无需额外运行器。

这些替代方案相比 stub 模式，能为您的项目带来更流畅、更可靠的开发体验，尤其是在项目规模扩大或需要插件支持时。关于这一决策的详细说明，请参阅 [这条 GitHub 评论](https://github.com/rolldown/tsdown/pull/164#issuecomment-2849720617)。

## tsdown 和 tsup 有什么区别？ {#tsdown-vs-tsup}

tsdown 是 tsup 的精神继承者，底层由 Rolldown 驱动，而非 esbuild。主要区别：

- **更快的构建速度**：Rolldown 提供了显著更好的性能，尤其在大型项目中。
- **更丰富的插件生态**：tsdown 支持 Rolldown、Rollup 和 unplugin 插件。
- **更多内置功能**：CSS 支持、可执行文件打包、工作区模式和包验证均已内置。

详细对比和迁移指南请参阅[从 tsup 迁移](./migrate-from-tsup.md)。

## 能否在 monorepo 中使用 tsdown？ {#monorepo}

可以。tsdown 内置工作区支持。使用 `--workspace`（或 `-W`）启用工作区模式，自动检测 monorepo 中的包。可通过 `--filter`（或 `-F`）过滤特定包：

```bash
tsdown -W -F my-package
```

根目录的配置会自动被工作区中的包继承。

## 为什么我的依赖被打包了？ {#dependencies-bundled}

默认情况下，tsdown 会打包所有导入的模块。要排除依赖（如 `package.json` 中列出的依赖），可使用 `deps` 配置：

```ts
export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
})
```

更多选项请参阅[依赖处理](../options/dependencies.md)。

## 如何生成类型声明文件？ {#dts}

使用 `dts` 选项：

```ts
export default defineConfig({
  dts: true,
})
```

当 `package.json` 包含 `types` 或 `typings` 字段，或 `exports` 条目包含类型条件时，tsdown 会自动启用 DTS 生成。更多高级选项请参阅[声明文件](../options/dts.md)。
