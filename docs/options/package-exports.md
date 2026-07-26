# Auto-Generating Package Exports

`tsdown` can automatically infer and generate the `exports` field in your `package.json`. This helps ensure your package exports are always up-to-date and correctly reflect your build outputs.

Top-level `main`, `module`, and `types` fields are controlled by the `exports.legacy` option, which defaults to `false` for ESM-only builds and `true` otherwise.

## Enabling Auto Exports

You can enable this feature by setting the `exports: true` option in your `tsdown` configuration file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: true,
})
```

This will automatically analyze your entry points and output files, and update the `exports` field in your `package.json` accordingly.

> [!WARNING]
> Please review the generated exports before publishing your package, or enable publint for validation.

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

## Legacy Package Fields

The `exports.legacy` option controls whether top-level `main`, `module`, and `types` fields are also generated for older tools. It defaults to `false` when only ESM output is built, and `true` when other formats (such as CJS) are included. Set it explicitly to override:

```ts
export default defineConfig({
  exports: {
    legacy: true,
  },
})
```

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
    devExports: '@my-org/source',
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

If you need more control over the generated exports, you can provide an object or a custom function via `exports.customExports`:

```ts
export default defineConfig({
  exports: {
    customExports: {
      './foo': './foo.js',
    },
  },
})
```

```ts
export default defineConfig({
  exports: {
    customExports(exports, context) {
      exports['./foo'] = './foo.js'
      return exports
    },
  },
})
```
