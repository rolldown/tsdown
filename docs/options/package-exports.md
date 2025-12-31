# Auto-Generating Package Exports

`tsdown` provides an experimental feature to automatically infer and generate the `exports`, `main`, `module`, and `types` fields in your `package.json`. This helps ensure your package exports are always up-to-date and correctly reflect your build outputs.

## Enabling Auto Exports

You can enable this feature by setting the `exports: true` option in your `tsdown` configuration file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: true,
})
```

This will automatically analyze your entry points and output files, and update your `package.json` accordingly.

> [!WARNING]
> Please review the generated fields before publishing your package, or enable publint for validation.

## Exporting All Files

By default, only entry files are exported. If you want to export all files (including those not listed as entry points), you can enable the `exports.all` option:

```ts
export default defineConfig({
  exports: {
    all: true,
  },
})
```

This will include all relevant files in the generated `exports` field.

## Dev-Time Source Linking

### Dev Exports {#dev-exports}

During development, you may want your `exports` to point directly to your source files for better debugging and editor support. You can enable this by setting `exports.devExports` to `true`:

```ts
export default defineConfig({
  exports: {
    devExports: true,
  },
})
```

With this setting, the generated `exports` in your `package.json` will link to your source code. The exports for the built output will be written to `publishConfig`, which will override the top-level `exports` field when using `yarn` or `pnpm`'s `pack`/`publish` commands (note: this is **not supported by npm**).

### Conditional Dev Exports

You can also set `exports.devExports` to a string to only link to source code under a specific [condition](https://nodejs.org/api/packages.html#conditional-exports):

```ts
export default defineConfig({
  exports: {
    devExports: 'development',
  },
})
```

This is especially useful when combined with TypeScript's [`customConditions`](https://www.typescriptlang.org/tsconfig/#customConditions) option, allowing you to control which conditions use the source code.

## CSS Exports

When `css.splitting` is `false`, the bundled CSS file is automatically added to `exports`:

```ts
export default defineConfig({
  css: {
    splitting: false,
  },
  exports: true,
})
```

The CSS filename defaults to `style.css` and can be customized via `css.fileName`.

## Customizing Exports

If you need more control over the generated exports, you can provide a custom function via `exports.customExports`:

```ts
export default defineConfig({
  exports: {
    customExports(pkg, context) {
      pkg['./foo'] = './foo.js'
      return pkg
    },
  },
})
```
