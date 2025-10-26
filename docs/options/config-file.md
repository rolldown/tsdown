# Config File

By default, `tsdown` will search for a configuration file by looking in the current working directory and traversing upward through parent directories until it finds one. It supports the following file names:

- `tsdown.config.ts`
- `tsdown.config.mts`
- `tsdown.config.cts`
- `tsdown.config.js`
- `tsdown.config.mjs`
- `tsdown.config.cjs`
- `tsdown.config.json`
- `tsdown.config`

Additionally, you can define your configuration directly in the `tsdown` field of your `package.json` file.

## Writing a Config File

The configuration file allows you to define and customize your build settings in a centralized and reusable way. Below is a simple example of a `tsdown` configuration file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
})
```

### Building Multiple Outputs

`tsdown` also supports returning an **array of configurations** from the config file. This allows you to build multiple outputs with different settings in a single run. For example:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: 'src/entry1.ts',
    platform: 'node',
  },
  {
    entry: 'src/entry2.ts',
    platform: 'browser',
  },
])
```

## Specifying a Custom Config File

If your configuration file is located elsewhere or has a different name, you can specify its path using the `--config` (or `-c`) option:

```bash
tsdown --config ./path/to/config
```

## Disabling the Config File {#disable-config-file}

To disable loading a configuration file entirely, use the `--no-config` option:

```bash
tsdown --no-config
```

This is useful if you want to rely solely on command-line options or default settings.

## Config Loaders

`tsdown` supports multiple config loaders to accommodate various file formats. You can select a config loader using the `--config-loader` option. The available loaders are:

- `auto` (default): Utilizes native runtime loading for TypeScript if supported; otherwise, defaults to `unconfig`.
- `native`: Loads TypeScript configuration files using native runtime support. Requires a compatible environment, such as the latest Node.js, Deno, or Bun.
- `unconfig`: Loads configuration files with the `unconfig` library, ensuring broad compatibility across different runtimes.
- `unrun` _(experimental)_: Loads configuration files using the [`unrun`](https://gugustinette.github.io/unrun/) library, which provides similar compatibility as `unconfig` but with more performances.

> [!TIP]
> Node.js does not natively support importing TypeScript files without specifying the file extension. If you are using Node.js and want to load a TypeScript config file without including the `.ts` extension, consider using the `unconfig` or `unrun` loader for seamless compatibility.

## Extending Vite or Vitest Config (Experimental)

`tsdown` provides an **experimental** feature to extend your existing Vite or Vitest configuration files. This allows you to reuse specific configuration options, such as `resolve` and `plugins`, while ignoring others that are not relevant to `tsdown`.

To enable this feature, use the `--from-vite` option:

```bash
tsdown --from-vite        # Load vite.config.*
tsdown --from-vite vitest # Load vitest.config.*
```

> [!WARNING]
> This feature is **experimental** and may not support all Vite or Vitest configuration options. Only specific options, such as `resolve` and `plugins`, are reused. Use with caution and test thoroughly in your project.

> [!TIP]
> Extending Vite or Vitest configurations can save time and effort if your project already uses these tools, allowing you to build upon your existing setup without duplicating configuration.

## Reference

For a full list of available configuration options, refer to the [Config Options Reference](../reference/api/Interface.Options.md). This includes detailed explanations of all supported fields and their usage.
