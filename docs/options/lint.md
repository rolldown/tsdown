# Package Validation (publint & attw)

tsdown integrates with [publint](https://publint.dev/) and [Are the types wrong?](https://arethetypeswrong.github.io/) (attw) to validate your package before publishing. These tools check for common issues in your `package.json` configuration and type definitions.

## Installation

Both tools are **optional dependencies** — you only need to install them if you want to use them:

::: code-group

```bash [publint]
npm install -D publint
```

```bash [attw]
npm install -D @arethetypeswrong/core
```

```bash [both]
npm install -D publint @arethetypeswrong/core
```

:::

## publint

[publint](https://publint.dev/) checks that your package is correctly configured for publishing. It validates `package.json` fields like `exports`, `main`, `module`, and `types` against your actual output files.

### Enable publint

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: true,
})
```

### Configuration

Pass options directly to customize publint's behavior:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: {
    level: 'error', // 'warning' | 'error' | 'suggestion'
  },
})
```

### CLI

```bash
tsdown --publint
```

## attw (Are the types wrong?)

[attw](https://arethetypeswrong.github.io/) verifies that your TypeScript declaration files are correct across different module resolution strategies (`node10`, `node16`, `bundler`). It catches issues like false ESM/CJS type declarations that can cause runtime errors for consumers.

### Enable attw

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  attw: true,
})
```

### Configuration

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  attw: {
    // Resolution profile:
    //   'strict'   - requires all resolutions (default)
    //   'node16'   - ignores node10 resolution failures
    //   'esm-only' - ignores CJS resolution failures
    profile: 'node16',

    // Level: 'warn' (default) or 'error' (fails the build)
    level: 'error',

    // Ignore specific problem types
    ignoreRules: ['false-cjs', 'cjs-resolves-to-esm'],
  },
})
```

### Profiles

| Profile    | Description                                           |
| ---------- | ----------------------------------------------------- |
| `strict`   | Requires all resolutions to pass (default)            |
| `node16`   | Ignores `node10` resolution failures                  |
| `esm-only` | Ignores `node10` and `node16-cjs` resolution failures |

### Ignore Rules

You can suppress specific problem types using `ignoreRules`:

| Rule                        | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `no-resolution`             | Module could not be resolved                            |
| `untyped-resolution`        | Resolution succeeded but has no types                   |
| `false-cjs`                 | Types indicate CJS but implementation is ESM            |
| `false-esm`                 | Types indicate ESM but implementation is CJS            |
| `cjs-resolves-to-esm`       | CJS resolution points to an ESM module                  |
| `fallback-condition`        | A fallback/wildcard condition was used                  |
| `cjs-only-exports-default`  | CJS module only exports a default                       |
| `named-exports`             | Named exports mismatch between types and implementation |
| `false-export-default`      | Types declare a default export that doesn't exist       |
| `missing-export-equals`     | Types are missing `export =` for CJS                    |
| `unexpected-module-syntax`  | File uses unexpected module syntax                      |
| `internal-resolution-error` | Internal resolution error in type checking              |

### CLI

```bash
tsdown --attw
```

## CI Integration

Both `publint` and `attw` support [CI-aware options](/advanced/ci). This is useful for running package validation only in CI:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: 'ci-only',
  attw: {
    enabled: 'ci-only',
    profile: 'node16',
    level: 'error',
  },
})
```

> [!NOTE]
> Both tools require a `package.json` in your project directory. If no `package.json` is found, a warning is logged and the check is skipped.
