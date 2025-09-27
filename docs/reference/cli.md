# Command Line Interface

All CLI flags can also be set in the configuration file for better reusability and maintainability in complex projects. Refer to the [Config File](../options/config-file.md) documentation for more details.

## `[...files]`

Specify entry files as command arguments. This is equivalent to setting the `entry` option in the configuration file. For example:

```bash
tsdown src/index.ts src/util.ts
```

This will bundle `src/index.ts` and `src/util.ts` as separate entry points. See the [Entry](../options/entry.md) documentation for more details.

## `-c, --config <filename>`

Specify a custom configuration file. Use this option to define the path to the configuration file you want to use.

See also [Config File](../options/config-file.md).

## `--config-loader <loader>`

Specifies which config loader to use.

See also [Config File](../options/config-file.md).

## `--no-config`

Disable loading a configuration file. This is useful if you want to rely solely on command-line options or default settings.

See also [Disabling the Config File](../options/config-file.md#disable-config-file).

## `--tsconfig <tsconfig>`

Specify the path or filename of your `tsconfig` file. `tsdown` will search upwards from the current directory to find the specified file. By default, it uses `tsconfig.json`.

```bash
tsdown --tsconfig tsconfig.build.json
```

## `--format <format>`

Define the bundle format. Supported formats include:

- `esm` (ECMAScript Modules)
- `cjs` (CommonJS)
- `iife` (Immediately Invoked Function Expression)
- `umd` (Universal Module Definition)

See also [Output Format](../options/output-format.md).

## `--clean`

Clean the output directory before building. This removes all files in the output directory to ensure a fresh build.

See also [Cleaning](../options/cleaning.md).

## `--external <module>`

Mark a module as external. This prevents the specified module from being included in the bundle.

See also [Dependencies](../options/dependencies.md).

## `--minify`

Enable minification of the output bundle to reduce file size. Minification removes unnecessary characters and optimizes the code for production.

See also [Minification](../options/minification.md).

## `--target <target>`

Specify the JavaScript target version for the bundle. Examples include:

- `es2015`
- `esnext`
- `chrome100`
- `node18`

You can also disable all syntax transformations by using `--no-target` or by setting the target to `false` in your configuration file.

See also [Target](../options/target.md).

## `--log-level <level>`

Set the log level to control the verbosity of logs during the build process.

See also [Log Level](../options/log-level.md).

### ~~`--silent`~~

**Deprecated:** Please use `--log-level error` instead for better compatibility.

Suppress non-error logs during the build process. Only error messages will be displayed, making it easier to focus on critical issues.

## `-d, --out-dir <dir>`

Specify the output directory for the bundled files. Use this option to customize where the output files are written.

See also [Output Directory](../options/output-directory.md).

## `--treeshake`, `--no-treeshake`

Enable or disable tree shaking. Tree shaking removes unused code from the final bundle, reducing its size and improving performance.

See also [Tree Shaking](../options/tree-shaking.md).

## `--sourcemap`

Generate source maps for the bundled files. Source maps help with debugging by mapping the output code back to the original source files.

See also [Source Maps](../options/sourcemap.md).

## `--shims`

Enable CommonJS (CJS) and ECMAScript Module (ESM) shims. This ensures compatibility between different module systems.

See also [Shims](../options/shims.md).

## `--platform <platform>`

Specify the target platform for the bundle. Supported platforms include:

- `node` (Node.js)
- `browser` (Web browsers)
- `neutral` (Platform-agnostic)

See also [Platform](../options/platform.md).

## `--dts`

Generate TypeScript declaration (`.d.ts`) files for the bundled code. This is useful for libraries that need to provide type definitions.

See also [Declaration Files](../options/dts.md).

## `--publint`

Enable `publint` to validate your package for publishing. This checks for common issues in your package configuration, ensuring it meets best practices.

## `--unused`

Enable unused dependencies checking. This helps identify dependencies in your project that are not being used, allowing you to clean up your `package.json`.

## `-w, --watch [path]`

Enable watch mode to automatically rebuild your project when files change. Optionally, specify a path to watch for changes.

See also [Watch Mode](../options/watch-mode.md).

## `--ignore-watch <path>`

Ignore custom paths in watch mode.

## `--from-vite [vitest]`

Reuse configuration from Vite or Vitest. This allows you to extend or integrate with existing Vite or Vitest configurations seamlessly.

See also [Extending Vite or Vitest Config](../options/config-file.md#extending-vite-or-vitest-config-experimental).

## `--report`, `--no-report`

Enable or disable the generation of a build report. By default, the report is enabled and outputs the list of build artifacts along with their sizes to the console. This provides a quick overview of the build results, helping you analyze the output and identify potential optimizations. Disabling the report can be useful in scenarios where minimal console output is desired.

## `--env.* <value>`

Define compile-time environment variables, for example:

```bash
tsdown --env.NODE_ENV=production
```

Note that environment variables defined with `--env.VAR_NAME` can only be accessed as `import.meta.env.VAR_NAME` or `process.env.VAR_NAME`.

## `--debug [feat]`

Show debug logs.

## `--on-success <command>`

Specify a command to run after a successful build. This is especially useful in watch mode to trigger additional scripts or actions automatically after each build completes.

```bash
tsdown --on-success "echo Build finished!"
```

## `--copy <dir>`

Copies all files from the specified directory to the output directory. This is useful for including static assets such as images, stylesheets, or other resources in your build output.

```bash
tsdown --copy public
```

All contents of the `public` directory will be copied to your output directory (e.g., `dist`).

## `--public-dir <dir>`

An alias for `--copy`.
**Deprecated:** Please use `--copy` instead for better clarity and consistency.

## `--exports`

generate the `exports`, `main`, `module`, and `types` fields in your `package.json`.

See also [Package Exports](../options/package-exports.md).
