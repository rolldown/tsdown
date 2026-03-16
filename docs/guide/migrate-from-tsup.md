# Migrate from tsup

[tsup](https://tsup.egoist.dev/) is a powerful and widely-used bundler that shares many similarities with `tsdown`. While `tsup` is built on top of [esbuild](https://esbuild.github.io/), `tsdown` leverages the power of [Rolldown](https://rolldown.rs/) to deliver a **faster** and more **powerful** bundling experience.

## Migration Guide

If you're currently using `tsup` and want to migrate to `tsdown`, the process is straightforward thanks to the dedicated `migrate` command:

```bash
npx tsdown-migrate
```

For monorepos, you can specify directories using glob patterns:

```bash
npx tsdown-migrate packages/*
```

Or specify multiple directories explicitly:

```bash
npx tsdown-migrate packages/foo packages/bar
```

> [!WARNING]
> Please save your changes before migration. The migration process may modify your configuration files, so it's important to ensure all your changes are committed or backed up beforehand.

> [!TIP]
> The migration tool will automatically install dependencies after migration. Make sure to run the command from within your project directory.

### Migration Options

The `migrate` command supports the following options to customize the migration process:

- `[...dirs]`: Specify directories to migrate. Supports glob patterns (e.g., `packages/*`). Defaults to the current directory if not specified.
- `--dry-run` (or `-d`): Perform a dry run to preview the migration without making any changes.

With these options, you can easily tailor the migration process to fit your specific project setup.

## Differences from tsup

While `tsdown` aims to be highly compatible with `tsup`, there are some differences to be aware of:

### Default Values

| Option   | tsup     | tsdown                                                             |
| -------- | -------- | ------------------------------------------------------------------ |
| `format` | `'cjs'`  | `'esm'`                                                            |
| `clean`  | `false`  | `true` (cleans `outDir` before each build)                         |
| `dts`    | `false`  | Auto-enabled if `package.json` contains `types` or `typings` field |
| `target` | _(none)_ | Auto-reads from `engines.node` in `package.json`                   |

### Option Renames

Some options have been renamed for clarity:

| tsup             | tsdown       | Notes                              |
| ---------------- | ------------ | ---------------------------------- |
| `cjsInterop`     | `cjsDefault` | CJS default export handling        |
| `esbuildPlugins` | `plugins`    | Now uses Rolldown/Unplugin plugins |

### Deprecated but Compatible Options

The following tsup options still work in tsdown for backward compatibility, but they emit deprecation warnings and **will be removed in a future version**. Migrate them to the preferred alternatives immediately.

| tsup (deprecated)          | tsdown (preferred)                      | Notes                             |
| -------------------------- | --------------------------------------- | --------------------------------- |
| `entryPoints`              | `entry`                                 | Also deprecated in tsup itself    |
| `publicDir`                | `copy`                                  | Copy static files to output       |
| `bundle: false`            | `unbundle: true`                        | Inverted to positive form         |
| `removeNodeProtocol: true` | `nodeProtocol: 'strip'`                 | More flexible with multiple modes |
| `injectStyle: true`        | `css: { inject: true }`                 | Moved into CSS namespace          |
| `external: [...]`          | `deps: { neverBundle: [...] }`          | Moved to deps namespace           |
| `noExternal: [...]`        | `deps: { alwaysBundle: [...] }`         | Moved to deps namespace           |
| `skipNodeModulesBundle`    | `deps: { skipNodeModulesBundle: true }` | Moved to deps namespace           |

tsdown also adds `deps.onlyBundle` for whitelisting allowed bundled packages.

### Plugin System

tsdown uses [Rolldown](https://rolldown.rs/) plugins instead of esbuild plugins. If you use [unplugin](https://github.com/unjs/unplugin) plugins, update the import path:

```ts
// Before (tsup)
import plugin from 'unplugin-example/esbuild'
// After (tsdown)
import plugin from 'unplugin-example/rolldown'
```

### Unsupported Options

The following tsup options are not available in tsdown:

| Option                        | Status         | Alternative                                                |
| ----------------------------- | -------------- | ---------------------------------------------------------- |
| `splitting: false`            | Always enabled | Code splitting cannot be disabled                          |
| `metafile`                    | Not available  | Use `devtools: true` for bundle analysis via Vite DevTools |
| `swc`                         | Not supported  | tsdown uses oxc for transformation (built-in)              |
| `experimentalDts`             | Superseded     | Use the `dts` option instead                               |
| `legacyOutput`                | Not supported  | No alternative                                             |
| `plugins` (tsup experimental) | Incompatible   | Migrate to Rolldown plugins                                |

If you find an option missing that you need, please [open an issue](https://github.com/rolldown/tsdown/issues) to let us know your requirements.

### New Features in tsdown

`tsdown` introduces many features not available in `tsup`:

- **`nodeProtocol`**: Control how Node.js built-in module imports are handled:
  - `true`: Add `node:` prefix to built-in modules (e.g., `fs` → `node:fs`)
  - `'strip'`: Remove `node:` prefix from imports (e.g., `node:fs` → `fs`)
  - `false`: Keep imports as-is (default)
- **`workspace`**: Build multiple packages in a monorepo with `workspace: 'packages/*'`
- **`exports`**: Auto-generate the `exports` field in `package.json` with `exports: true`
- **`publint`** / **`attw`**: Validate your package for common issues and type correctness
- **`exe`**: Bundle as a Node.js standalone executable (SEA) with `exe: true`
- **`devtools`**: Vite DevTools integration for bundle analysis with `devtools: true`
- **`hooks`**: Lifecycle hooks (`build:prepare`, `build:before`, `build:done`) for custom build logic
- **`css`**: Full CSS pipeline with preprocessors, Lightning CSS, PostCSS, CSS modules, and code splitting
- **`globImport`**: Support for `import.meta.glob` (Vite-style glob imports)

Please review your configuration after migration to ensure it matches your expectations.

> [!TIP]
> An AI skill is available for guided migration assistance: `npx skills add rolldown/tsdown --skill tsdown-migrate`

## Acknowledgements

`tsdown` would not have been possible without the inspiration and contributions of the open-source community. We would like to express our heartfelt gratitude to the following:

- **[tsup](https://tsup.egoist.dev/)**: `tsdown` was heavily inspired by `tsup`, and even incorporates parts of its codebase. The simplicity and efficiency of `tsup` served as a guiding light during the development of `tsdown`.
- **[@egoist](https://github.com/egoist)**: The creator of `tsup`, whose work has significantly influenced the JavaScript and TypeScript tooling ecosystem. Thank you for your dedication and contributions to the community.
