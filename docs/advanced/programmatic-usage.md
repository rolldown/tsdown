# Programmatic Usage

You can use `tsdown` directly from your JavaScript or TypeScript code. This is useful for custom build scripts, integrations, or advanced automation.

## Example

```ts twoslash
import { build } from 'tsdown'

await build({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  // ...any other options
})
```

All CLI options are available as properties in the options object. See [Config Options](../reference/api/Interface.Options.md) for the full list.
