# CI Environment Support

tsdown automatically detects CI environments and allows you to enable or disable specific features depending on whether the build runs locally or in CI.

## CI Detection

tsdown uses the [`is-in-ci`](https://www.npmjs.com/package/is-in-ci) package to detect CI environments. This covers all major CI providers including GitHub Actions, GitLab CI, Jenkins, CircleCI, Travis CI, and more.

## CI-Aware Options

Several options support CI-aware behavior through the `'ci-only'` and `'local-only'` values:

| Value          | Behavior                             |
| -------------- | ------------------------------------ |
| `true`         | Always enabled                       |
| `false`        | Always disabled                      |
| `'ci-only'`    | Enabled only in CI, disabled locally |
| `'local-only'` | Enabled only locally, disabled in CI |

### Supported Options

The following options accept CI-aware values:

- [`dts`](/options/dts) — TypeScript declaration file generation
- [`publint`](/options/lint) — Package lint validation
- [`attw`](/options/lint) — "Are the types wrong" validation
- `report` — Bundle size reporting
- [`exports`](/options/package-exports) — Auto-generate `package.json` exports
- `unused` — Unused dependency check
- `devtools` — DevTools integration
- `failOnWarn` — Fail on warnings (defaults to `false`)

### Basic Usage

Pass a CI option string directly:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // Only generate declaration files locally (skip in CI for faster builds)
  dts: 'local-only',
  // Only run publint in CI
  publint: 'ci-only',
  // Fail on warnings in CI only (default is false)
  failOnWarn: 'ci-only',
})
```

### Object Form

When an option takes a configuration object, you can set the `enabled` property to a CI-aware value:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  publint: {
    enabled: 'ci-only',
    level: 'error',
  },
  attw: {
    enabled: 'ci-only',
    profile: 'node16',
  },
})
```

## Config Function

The config function receives a `ci` boolean in its context, allowing dynamic configuration:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig((_, { ci }) => ({
  minify: ci,
  sourcemap: !ci,
}))
```

## Example: CI Pipeline

A typical CI-optimized configuration:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  dts: true,
  // Fail on warnings in CI (default is false)
  failOnWarn: 'ci-only',
  // Run package validators in CI
  publint: 'ci-only',
  attw: 'ci-only',
})
```
