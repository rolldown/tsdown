# How It Works

This page gives a high-level overview of what tsdown does out of the box and which options let you adjust each behavior. For full details, follow the links to the dedicated option pages.

## Dependencies {#dependencies}

When you publish a library, your consumers install its `dependencies` and `peerDependencies` alongside it. There's no need to bundle those packages into your output — they'll already be available at runtime.

**Default behavior:**

- **`dependencies` and `peerDependencies`** are **externalized** — they appear as `import` / `require` statements in the output and are not included in the bundle.
- **`devDependencies`** are **bundled if imported**. Since they won't be installed by consumers, any code you import from a devDependency is inlined into your output automatically.
- **Phantom dependencies** (installed in `node_modules` but not listed in your `package.json`) follow the same rule as devDependencies — bundled only if used.

**Key options:**

| Option                                                                               | What it does                                                                                                                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`inlineOnly`](../options/dependencies.md#strict-inline-control-with-inlineonly)     | Whitelist of dependencies allowed to be bundled. Any unlisted dependency that ends up in the bundle causes an error. Useful for catching accidental inlining in large projects. |
| [`external`](../options/dependencies.md#external)                                    | Explicitly mark additional packages as external (never bundled).                                                                                                                |
| [`noExternal`](../options/dependencies.md#noexternal)                                | Force specific packages to be bundled, even if they're in `dependencies`.                                                                                                       |
| [`skipNodeModulesBundle`](../options/dependencies.md#skipping-node-modules-bundling) | Skip resolving and bundling everything from `node_modules`.                                                                                                                     |

See [Dependencies](../options/dependencies.md) for details.

## Output Format {#output-format}

tsdown produces **ESM** output by default. You can generate multiple formats in a single build, and even override options per format.

**Key options:**

| Option                                  | What it does                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`format`](../options/output-format.md) | Set to `esm`, `cjs`, `iife`, or `umd`. Pass multiple values (e.g. `format: ['esm', 'cjs']`) for dual-format builds. |
| [`shims`](../options/shims.md)          | Inject compatibility shims (e.g. `__dirname` for ESM, `import.meta` for CJS).                                       |

See [Output Format](../options/output-format.md) for details.

## Declaration Files (dts) {#dts}

tsdown generates `.d.ts` files so consumers get full TypeScript support.

**Default behavior:**

- If your `package.json` has a `types` or `typings` field, dts generation is **enabled automatically**.
- With [`isolatedDeclarations`](https://www.typescriptlang.org/tsconfig/#isolatedDeclarations) enabled in your `tsconfig.json`, tsdown uses the fast **oxc-transform** path. Otherwise, it falls back to the TypeScript compiler.

**Key options:**

| Option                     | What it does                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| [`dts`](../options/dts.md) | Enable/disable dts, or pass an object for advanced settings like `resolver` and `sourcemap`. |

See [Declaration Files](../options/dts.md) for details.

## Package Exports {#package-exports}

When publishing a library, the `exports` field in `package.json` tells consumers and bundlers how to resolve your package's entry points.

**Default behavior:**

- Auto-generation of `exports` is **off by default**. You manage the `exports` field in your `package.json` yourself.

**With `exports: true`:**

- tsdown analyzes your entry points and output files, then writes the `exports`, `main`, `module`, and `types` fields in your `package.json` automatically.
- For dual-format builds (ESM + CJS), it generates conditional exports with `import` and `require` conditions.

**Key options:**

| Option                                                                       | What it does                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`exports`](../options/package-exports.md)                                   | Set to `true` to enable auto-generation, or pass an object for fine-tuning. |
| [`exports.all`](../options/package-exports.md#exporting-all-files)           | Export all output files, not just entry points.                             |
| [`exports.devExports`](../options/package-exports.md#dev-exports)            | Point exports to source files during development for better editor support. |
| [`exports.customExports`](../options/package-exports.md#customizing-exports) | A function that lets you modify or extend the generated exports.            |

See [Package Exports](../options/package-exports.md) for details.

## Package Validation {#package-validation}

tsdown integrates with [publint](https://publint.dev/) and [attw](https://arethetypeswrong.github.io/) to catch publishing mistakes before they reach npm.

**Default behavior:**

- Both tools are **disabled by default** and are optional peer dependencies.

**What they check:**

- **publint** validates your `package.json` configuration — it checks that `exports`, `main`, `module`, and `types` point to files that actually exist, that module formats are correct, and flags common misconfigurations.
- **attw** (Are the types wrong?) verifies that your TypeScript declarations resolve correctly under different module resolution strategies (`node10`, `node16`, `bundler`), catching issues like false ESM/CJS type declarations.

**Key options:**

| Option                                                | What it does                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| [`publint`](../options/lint.md#publint)               | Set to `true` or `'ci-only'` to enable.                                     |
| [`attw`](../options/lint.md#attw-are-the-types-wrong) | Set to `true` or pass an object with `profile`, `level`, and `ignoreRules`. |

See [Package Validation](../options/lint.md) for details.

## Other Defaults {#other-defaults}

A few more things tsdown handles for you:

- **Output directory** — Defaults to `dist/`. The output directory is **cleaned before each build**. Use `--no-clean` to keep existing files. See [Cleaning](../options/cleaning.md).
- **Tree-shaking** — Enabled by default. Dead code is removed from the output. See [Tree-shaking](../options/tree-shaking.md).
- **Platform** — Defaults to `node`. See [Platform](../options/platform.md).
- **Target** — Inferred from your `package.json` `engines` field, or defaults to the latest stable Node.js version. See [Target](../options/target.md).
