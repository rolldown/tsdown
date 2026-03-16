# Detailed Differences: tsdown vs tsup

Comprehensive comparison of tsdown and tsup for understanding migration impact and new capabilities.

## Architecture

| Aspect | tsup | tsdown |
|--------|------|--------|
| Core bundler | esbuild (Go) | Rolldown (Rust) |
| Plugin system | esbuild plugins | Rolldown + Rollup + Unplugin plugins |
| Type declarations | Single pass | Dual-format with separate CJS dts pass |
| Package.json integration | Basic | Advanced (auto-exports, validation) |
| Watch mode | Standard | Enhanced with keyboard shortcuts (`r` rebuild, `q` quit) |
| Module system | CJS-first | ESM-first |

## Default Value Comparison

| Option | tsup | tsdown | Impact |
|--------|------|--------|--------|
| `format` | `'cjs'` | `'esm'` | Output format changes — set explicitly during migration |
| `clean` | `false` | `true` | Output dir cleaned before build — may surprise users |
| `dts` | `false` | Auto if `types`/`typings` in package.json | Types generated automatically — usually desired |
| `target` | _(none)_ | Reads `engines.node` from package.json | Compilation target auto-detected — usually desired |

## Feature Compatibility

### Fully Supported (works the same)

- Multiple entry points (array, object, globs)
- Multiple formats (ESM, CJS, IIFE, UMD)
- TypeScript declarations (`dts`)
- Source maps
- Minification
- Watch mode
- Tree shaking
- Shims (`__dirname`, `__filename`, `require`)
- Clean output directory
- Define (global constants)
- Banner/footer injection
- `onSuccess` callback

### Supported with Changes (Renamed)

| Feature | tsup | tsdown | Change |
|---------|------|--------|--------|
| CJS interop | `cjsInterop` | `cjsDefault` | Property rename |
| Plugins | `esbuildPlugins` | `plugins` | Different plugin format (Rolldown) |

### Deprecated but Compatible

These tsup options still work in tsdown but emit deprecation warnings. They will be removed in a future version — migrate immediately.

| Feature | tsup (deprecated) | tsdown (preferred) | Change |
|---------|-------------------|--------------------|--------|
| Entry points | `entryPoints` | `entry` | Also deprecated in tsup itself |
| Copy files | `publicDir` | `copy` | Property rename |
| Bundleless | `bundle: false` | `unbundle: true` | Inverted logic |
| Strip node: | `removeNodeProtocol` | `nodeProtocol: 'strip'` | New option with more modes |
| CSS inject | `injectStyle` | `css: { inject: true }` | Moved to css namespace |
| External deps | `external` | `deps.neverBundle` | Moved to deps namespace |
| Inline deps | `noExternal` | `deps.alwaysBundle` | Moved to deps namespace |
| Skip node_modules | `skipNodeModulesBundle` | `deps.skipNodeModulesBundle` | Moved to deps namespace |

### Not Supported

| Feature | Reason | Alternative |
|---------|--------|-------------|
| `splitting: false` | Code splitting always enabled | None — splitting cannot be disabled |
| `metafile` | Not implemented | `devtools: true` for bundle analysis |
| `swc` | Uses oxc instead | Built-in, no config needed |
| `experimentalDts` | Superseded | Use `dts` option |
| `legacyOutput` | Not implemented | None |
| `plugins` (tsup API) | Different plugin architecture | Rewrite as Rolldown/Unplugin plugins |

## New Features in tsdown

### Node Protocol Control

```ts
nodeProtocol: true       // Add node: prefix (fs → node:fs)
nodeProtocol: 'strip'    // Remove node: prefix (node:fs → fs)
nodeProtocol: false       // Keep as-is (default)
```

### Workspace / Monorepo

```ts
export default defineConfig({
  workspace: 'packages/*',
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
})
```

### Auto Package Exports

```ts
export default defineConfig({
  exports: true, // Auto-generate package.json exports field
})
```

### Package Validation

```ts
export default defineConfig({
  publint: true,    // Lint package for common issues
  attw: true,       // Check "are the types wrong"
})
```

### Standalone Executable

```ts
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: true, // Bundle as Node.js SEA
})
```

### Vite DevTools

```ts
export default defineConfig({
  devtools: true, // Vite DevTools bundle analysis
})
```

### Lifecycle Hooks

```ts
export default defineConfig({
  hooks: {
    'build:prepare': async (ctx) => { /* before any build */ },
    'build:before': async (ctx) => { /* before each format */ },
    'build:done': async (ctx) => { /* after build, access chunks */ },
  },
})
```

### CSS Modules

```ts
export default defineConfig({
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
```

### Glob Import

```ts
export default defineConfig({
  globImport: true, // Support import.meta.glob (Vite-style)
})
```

## Related

- [guide-option-mappings.md](guide-option-mappings.md) - Before/after for every option
- [guide-package-json.md](guide-package-json.md) - Package.json migration
