# Option Mappings: tsup → tsdown

Complete before/after reference for every config option transformation.

## Property Renames

### cjsInterop → cjsDefault

```ts
// Before (tsup)
export default defineConfig({
  cjsInterop: true,
})

// After (tsdown)
export default defineConfig({
  cjsDefault: true,
})
```

### esbuildPlugins → plugins

```ts
// Before (tsup)
import myPlugin from 'unplugin-example/esbuild'

export default defineConfig({
  esbuildPlugins: [myPlugin()],
})

// After (tsdown)
import myPlugin from 'unplugin-example/rolldown'

export default defineConfig({
  plugins: [myPlugin()],
})
```

Note: All `unplugin-*/esbuild` imports must change to `unplugin-*/rolldown`.

## Deprecated but Compatible

These options still work in tsdown for backward compatibility but emit deprecation warnings. Migrate them immediately — they will be removed in a future version.

### entryPoints → entry

`entryPoints` is also deprecated in tsup itself. Both tsup and tsdown use `entry`.

```ts
// Before (tsup)
export default defineConfig({
  entryPoints: ['src/index.ts', 'src/cli.ts'],
})

// After (tsdown)
export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
})
```

### publicDir → copy

```ts
// Before (tsup)
export default defineConfig({
  publicDir: 'public',
})

// After (tsdown)
export default defineConfig({
  copy: 'public',
})
```

### bundle → unbundle

```ts
// Before (tsup) — bundle: true is default, just remove
export default defineConfig({
  bundle: true,
})

// After (tsdown) — remove entirely
export default defineConfig({})
```

```ts
// Before (tsup) — bundle: false
export default defineConfig({
  bundle: false,
})

// After (tsdown)
export default defineConfig({
  unbundle: true,
})
```

### removeNodeProtocol → nodeProtocol

```ts
// Before (tsup)
export default defineConfig({
  removeNodeProtocol: true,
})

// After (tsdown)
export default defineConfig({
  nodeProtocol: 'strip',
})
```

### injectStyle → css.inject

```ts
// Before (tsup)
export default defineConfig({
  injectStyle: true,
})

// After (tsdown)
export default defineConfig({
  css: { inject: true },
})
```

`injectStyle: false` should be removed (it's the default).

### external → deps.neverBundle

```ts
// Before (tsup)
export default defineConfig({
  external: ['react', 'react-dom', /^@myorg\//],
})

// After (tsdown)
export default defineConfig({
  deps: {
    neverBundle: ['react', 'react-dom', /^@myorg\//],
  },
})
```

### noExternal → deps.alwaysBundle

```ts
// Before (tsup)
export default defineConfig({
  noExternal: ['lodash-es'],
})

// After (tsdown)
export default defineConfig({
  deps: {
    alwaysBundle: ['lodash-es'],
  },
})
```

### Combined Example

```ts
// Before (tsup)
export default defineConfig({
  external: ['react'],
  noExternal: ['lodash-es'],
})

// After (tsdown)
export default defineConfig({
  deps: {
    neverBundle: ['react'],
    alwaysBundle: ['lodash-es'],
  },
})
```

## Full Migration Example

```ts
// Before (tsup.config.ts)
import { defineConfig } from 'tsup'
import myPlugin from 'unplugin-example/esbuild'

export default defineConfig({
  entryPoints: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  bundle: true,
  external: ['react'],
  noExternal: ['lodash-es'],
  publicDir: 'public',
  cjsInterop: true,
  removeNodeProtocol: true,
  injectStyle: true,
  esbuildPlugins: [myPlugin()],
  splitting: true,
  clean: true,
})

// After (tsdown.config.ts)
import { defineConfig } from 'tsdown'
import myPlugin from 'unplugin-example/rolldown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  deps: {
    neverBundle: ['react'],
    alwaysBundle: ['lodash-es'],
  },
  copy: 'public',
  cjsDefault: true,
  nodeProtocol: 'strip',
  css: { inject: true },
  plugins: [myPlugin()],
  // splitting removed — always enabled in tsdown
  clean: true,
})
```

## Related

- [guide-differences-detailed.md](guide-differences-detailed.md) - Architecture and feature comparison
- [guide-package-json.md](guide-package-json.md) - Package.json migration
