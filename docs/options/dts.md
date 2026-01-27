# Declaration Files (dts)

Declaration files (`.d.ts`) are an essential part of TypeScript libraries, providing type definitions that allow consumers of your library to benefit from TypeScript's type checking and IntelliSense.

`tsdown` makes it easy to generate and bundle declaration files for your library, ensuring a seamless developer experience for your users.

> [!NOTE]
> You must install `typescript` in your project for declaration file generation to work properly.

## How dts Works in tsdown

`tsdown` uses [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts) internally to generate and bundle `.d.ts` files. This plugin is specifically designed to handle declaration file generation efficiently and integrates seamlessly with `tsdown`.

If you encounter any issues related to `.d.ts` generation, please report them directly to the [rolldown-plugin-dts repository](https://github.com/sxzz/rolldown-plugin-dts/issues).

## Enabling dts Generation

If your `package.json` contains a `types` or `typings` field, declaration file generation will be **enabled by default** in `tsdown`.

You can also explicitly enable `.d.ts` generation using the `--dts` option in the CLI or by setting `dts: true` in your configuration file.

### CLI

```bash
tsdown --dts
```

### Config File

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: true,
})
```

## Declaration Map

Declaration maps allow `.d.ts` files to be mapped back to their original `.ts` sources, which is especially useful in monorepo setups for improved navigation and debugging. Learn more in the [TypeScript documentation](https://www.typescriptlang.org/tsconfig/#declarationMap).

You can enable declaration maps in either of the following ways (no need to set both):

### Enable in `tsconfig.json`

Enable the `declarationMap` option under `compilerOptions`:

```json [tsconfig.json]
{
  "compilerOptions": {
    "declarationMap": true
  }
}
```

### Enable in tsdown Config

Set the `dts.sourcemap` option to `true` in your tsdown config file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    sourcemap: true,
  },
})
```

## Performance Considerations

The performance of `.d.ts` generation depends on your `tsconfig.json` configuration:

### With `isolatedDeclarations`

If your `tsconfig.json` has the `isolatedDeclarations` option enabled, `tsdown` will use **oxc-transform** for `.d.ts` generation. This method is **extremely fast** and highly recommended for optimal performance.

```json [tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true
  }
}
```

### Without `isolatedDeclarations`

If `isolatedDeclarations` is not enabled, `tsdown` will fall back to using the TypeScript compiler for `.d.ts` generation. While this approach is reliable, it is relatively slower compared to `oxc-transform`.

> [!TIP]
> If speed is critical for your workflow, consider enabling `isolatedDeclarations` in your `tsconfig.json`.

## Build Process for dts

- **For ESM Output**: Both `.js` and `.d.ts` files are generated in the **same build process**. If you encounter compatibility issues, please report them.
- **For CJS Output**: A **separate build process** is used exclusively for `.d.ts` generation to ensure compatibility.

## Using tsgo (Experimental)

`tsdown` supports generating `.d.ts` files using [tsgo](https://github.com/nicholasdly/tsgo), the native TypeScript port written in Go. This is an experimental feature that can provide faster declaration file generation.

### Enabling tsgo

You can enable tsgo in your configuration file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: true,
  },
})
```

### Custom tsgo Path

If you have tsgo installed in a custom location (e.g., managed by Nix), you can specify the path:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    tsgo: {
      path: '/path/to/tsgo',
    },
  },
})
```

### Environment Variable

You can also set the tsgo path via the `TSGO_PATH` environment variable. This is useful for CI environments or when you don't want to modify the configuration file:

```bash
TSGO_PATH=/path/to/tsgo tsdown
```

> [!NOTE]
> The `dts.tsgo` option in the configuration file takes precedence over the `TSGO_PATH` environment variable.

> [!WARNING]
> tsgo support is experimental and not yet recommended for production environments.

## Advanced Options

`rolldown-plugin-dts` provides several advanced options to customize `.d.ts` generation. For a detailed explanation of these options, refer to the [plugin's documentation](https://github.com/sxzz/rolldown-plugin-dts#options).
