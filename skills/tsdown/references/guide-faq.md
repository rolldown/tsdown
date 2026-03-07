# Frequently Asked Questions

## Why No Stub Mode? {#stub-mode}

tsdown does not support stub mode because:
- Requires re-running whenever named exports change
- Incompatible with plugins

**Alternatives:**
1. **Watch Mode**: `tsdown --watch` — auto-rebuild on changes
2. **Dev Exports**: Use `exports.devExports` to point to source files in dev, built files in production
   - With plugins: Use [vite-node](https://github.com/antfu-collective/vite-node)
   - Without plugins: Use [tsx](https://github.com/privatenumber/tsx), [jiti](https://github.com/unjs/jiti), or Node.js v22.18.0+ native TS support

## tsdown vs tsup? {#tsdown-vs-tsup}

tsdown is tsup's spiritual successor, powered by Rolldown instead of esbuild:
- **Faster builds**: Rolldown provides significantly better performance
- **Richer plugins**: Supports Rolldown, Rollup, and unplugin plugins
- **More features**: CSS support, executable bundling, workspace mode, package validation

See [Migrate from tsup](guide-migrate-from-tsup.md).

## Monorepo Usage? {#monorepo}

Yes. Use `--workspace` (`-W`) to enable workspace mode. Filter with `--filter` (`-F`):

```bash
tsdown -W -F my-package
```

Root config is inherited by workspace packages.

## Dependencies Being Bundled? {#dependencies-bundled}

By default, all imports are bundled. To exclude:

```ts
export default defineConfig({
  deps: {
    skipNodeModulesBundle: true,
  },
})
```

See [Dependencies](option-dependencies.md).

## How to Generate .d.ts? {#dts}

```ts
export default defineConfig({
  dts: true,
})
```

Auto-enabled when `package.json` has `types`/`typings` fields or `exports` with type conditions.

See [Declaration Files](option-dts.md).
