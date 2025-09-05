# 命令行接口

所有 CLI 参数也可以在配置文件中设置，以便在复杂项目中实现更好的复用性和可维护性。有关更多详细信息，请参阅 [配置文件](../options/config-file.md) 文档。

## `[...files]`

通过命令参数指定入口文件。这等同于在配置文件中设置 `entry` 选项。例如：

```bash
tsdown src/index.ts src/util.ts
```

这将把 `src/index.ts` 和 `src/util.ts` 作为独立的入口点进行打包。有关更多详细信息，请参阅 [入口](../options/entry.md) 文档。

## `-c, --config <filename>`

指定自定义配置文件。使用此选项定义要使用的配置文件路径。

另请参阅 [配置文件](../options/config-file.md)。

## `--no-config`

禁用加载配置文件。如果您希望仅依赖命令行选项或默认设置，此选项非常有用。

另请参阅 [禁用配置文件](../options/config-file.md#disable-config-file)。

## `--tsconfig <tsconfig>`

指定您的 `tsconfig` 文件的路径或文件名。`tsdown` 会从当前目录向上查找指定的文件。默认情况下使用 `tsconfig.json`。

```bash
tsdown --tsconfig tsconfig.build.json
```

## `--format <format>`

定义打包格式。支持的格式包括：

- `esm`（ECMAScript 模块）
- `cjs`（CommonJS）
- `iife`（立即调用函数表达式）
- `umd`（通用模块定义）

另请参阅 [输出格式](../options/output-format.md)。

## `--clean`

在构建之前清理输出目录。这会删除输出目录中的所有文件，以确保干净的构建。

另请参阅 [清理](../options/cleaning.md)。

## `--external <module>`

将模块标记为外部依赖。这会阻止指定的模块被包含在打包文件中。

另请参阅 [依赖处理](../options/dependencies.md)。

## `--minify`

启用输出包的压缩以减少文件大小。压缩会移除不必要的字符并优化代码以用于生产环境。

另请参阅 [压缩](../options/minification.md)。

## `--target <target>`

指定打包的 JavaScript 目标版本。例如：

- `es2015`
- `esnext`
- `chrome100`
- `node18`

您也可以在配置文件中将目标设置为 `false` 来禁用所有语法转换。

另请参阅 [构建目标](../options/target.md)。

## `--silent`

在构建过程中屏蔽非错误日志。仅显示错误消息，使您更专注于关键问题。

另请参阅 [静默模式](../options/silent-mode.md)。

## `-d, --out-dir <dir>`

指定打包文件的输出目录。使用此选项自定义输出文件的存放位置。

另请参阅 [输出目录](../options/output-directory.md)。

## `--treeshake`, `--no-treeshake`

启用或禁用除屑优化。除屑优化会从最终包中移除未使用的代码，减少文件大小并提升性能。

另请参阅 [除屑优化](../options/tree-shaking.md)。

## `--sourcemap`

为打包文件生成源映射。源映射通过将输出代码映射回原始源文件，帮助调试。

另请参阅 [源映射](../options/sourcemap.md)。

## `--shims`

启用 CommonJS (CJS) 和 ECMAScript 模块 (ESM) 的 shim。这确保了不同模块系统之间的兼容性。

另请参阅 [Shims](../options/shims.md)。

## `--platform <platform>`

指定打包的目标平台。支持的平台包括：

- `node`（Node.js）
- `browser`（Web 浏览器）
- `neutral`（与平台无关）

另请参阅 [运行平台](../options/platform.md)。

## `--dts`

为打包代码生成 TypeScript 声明文件（`.d.ts`）。这对于需要提供类型定义的库非常有用。

另请参阅 [声明文件](../options/dts.md)。

## `--publint`

启用 `publint` 以验证您的包是否适合发布。此功能检查包配置中的常见问题，确保符合最佳实践。

## `--unused`

启用未使用依赖项检查。这有助于识别项目中未使用的依赖项，方便清理 `package.json`。

## `-w, --watch [path]`

启用监听模式，在文件更改时自动重新构建项目。您还可以选择指定一个路径以监听更改。

另请参阅 [监听模式](../options/watch-mode.md)。

## `--ignore-watch <path>`

在监听模式下忽略自定义路径。

## `--from-vite [vitest]`

重用 Vite 或 Vitest 的配置。这允许您无缝扩展或集成现有的 Vite 或 Vitest 配置。

另请参阅 [扩展 Vite 或 Vitest 配置](../options/config-file.md#extending-vite-or-vitest-config-experimental)。

## `--report`, `--no-report`

启用或禁用构建报告的生成。默认情况下，报告是启用的，会在控制台输出构建产物列表及其大小，帮助您快速了解构建结果并发现潜在优化空间。在需要极简控制台输出的场景下可以关闭报告。

## `--env.* <value>`

定义编译时环境变量，例如：

```bash
tsdown --env.NODE_ENV=production
```

注意，通过 `--env.VAR_NAME` 定义的环境变量只能通过 `import.meta.env.VAR_NAME` 或 `process.env.VAR_NAME` 访问。

## `--debug [feat]`

显示调试日志。

## `--on-success <command>`

指定构建成功后要运行的命令。这在监听模式下尤其有用，可以在每次构建完成后自动触发额外脚本或操作。

```bash
tsdown --on-success "echo Build finished!"
```

## `--copy <dir>`

将指定目录下的所有文件复制到输出目录。适用于在构建输出中包含静态资源，如图片、样式表或其他资源。

```bash
tsdown --copy public
```

`public` 目录中的所有内容将被复制到您的输出目录（如 `dist`）。

## `--public-dir <dir>`

`--copy` 的别名。
**已废弃：** 为了更清晰和一致，建议使用 `--copy` 选项。

## `--exports`

自动生成 `package.json` 中的 `exports`、`main`、`module` 和 `types` 字段。

另请参阅 [包导出](../options/package-exports.md)。
