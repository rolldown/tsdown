# Workspace

Workspace mode enables building multiple packages in a monorepo from a single `tsdown` invocation. The root configuration is automatically inherited by each sub-package, with per-package overrides supported when needed.

## Quick Start

```bash
tsdown --workspace
```

Or in config:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  workspace: true,
  entry: ['src/index.ts'],
})
```

Given:

```
my-monorepo/
|-- package.json
|-- tsdown.config.ts      # workspace: true, entry: ['packages/*']
|-- packages/
|   |-- foo/
|   |   |-- package.json
|   |   |-- src/index.ts
|   |-- bar/
|       |-- package.json
|       |-- src/index.ts
```

Both `foo` and `bar` are built using the root config, each outputting to its own `dist/`.

## Package Discovery

### Auto Mode

`workspace: true` scans for `**/package.json` (excluding the root) and treats each matching file's parent directory as a workspace package:

```ts
export default defineConfig({ workspace: true })
```

Default exclusions:

- `**/node_modules/**`
- `**/dist/**`
- `**/test?(s)/**`
- `**/t?(e)mp/**`

Customize exclusions:

```ts
export default defineConfig({
  workspace: {
    include: 'auto',
    exclude: ['**/node_modules/**', '**/dist/**', '**/vendor/**'],
  },
})
```

### Explicit Mode

When sub-packages don't all have `package.json` or you want to restrict which directories participate:

```ts
// Glob pattern
export default defineConfig({ workspace: 'packages/*' })

// Multiple paths
export default defineConfig({ workspace: ['packages/foo', 'packages/bar'] })

// Object form
export default defineConfig({
  workspace: {
    include: 'packages/*',
  },
})
```

In explicit mode, directories are matched by glob. A `package.json` is **not** required for discovery.

## Filtering Packages

`--filter` (or `-F`) restricts which packages are built, matched against the package name or directory:

```bash
tsdown -W -F my-package
tsdown -W -F /packages\/utils/
```

## Configuration Inheritance

The root config is merged into each sub-package's config: sub-package values override root values, and any option not set by the sub-package falls back to the root.

```ts [tsdown.config.ts]
export default defineConfig({
  workspace: true,
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  clean: true,
  dts: true,
})
```

```ts [packages/bar/tsdown.config.ts]
// Sub-package:
export default defineConfig({
  // override entry
  entry: ['index.ts'],
  // format, clean, dts inherited from root
})
```

All path-based options (`entry`, `outDir`, etc.) are resolved relative to each sub-package's directory.

## Per-Package Configuration

Sub-packages can define their own configuration through a config file in the sub-package directory or the `tsdown` field in their `package.json`. See [Config File](./config-file.md) for supported formats and loaders.

### Accessing Root Config

A sub-package config function receives the resolved root config:

```ts [packages/bar/tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig((_inlineConfig, { rootConfig }) => ({
  entry: rootConfig.entry ?? ['index.ts'],
}))
```

### Disabling Per-Package Configs

When all sub-packages share the same configuration, skip per-package config loading:

```ts
export default defineConfig({
  workspace: {
    config: false,
  },
})
```

With `config: false`, sub-package `tsdown.config.*` files and the `package.json#tsdown` field are ignored. The root config applies as-is to every sub-package.

