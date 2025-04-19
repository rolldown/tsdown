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

### Specifying a Custom Config File

If your configuration file is located elsewhere or has a different name, you can specify its path using the `--config` (or `-c`) option:

```bash
tsdown --config ./path/to/config
```

### Disabling the Config File

To disable loading a configuration file entirely, use the `--no-config` option:

```bash
tsdown --no-config
```

This is useful if you want to rely solely on command-line options or default settings.

### Extending Vite or Vitest Config (Experimental)

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
