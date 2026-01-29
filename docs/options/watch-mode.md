# Watch Mode

Watch mode allows `tsdown` to automatically re-bundle your code whenever changes are detected in the specified files or directories. This is particularly useful during development to streamline the build process.

### Enabling Watch Mode

You can enable watch mode using the `--watch` (or `-w`) option:

```bash
tsdown --watch
```

### Watching Specific Paths

By default, `tsdown` watches the files in your project that are part of the build process. However, you can specify a custom path to watch for changes:

```bash
tsdown --watch <path>
```

### Example

```bash
# Watch all files in the project (default behavior)
tsdown --watch

# Watch a specific directory
tsdown --watch ./src

# Watch a specific file
tsdown --watch ./src/index.ts
```

> [!TIP]
> Watch mode is ideal for development workflows, as it eliminates the need to manually rebuild your project after every change.

See also [Why tsdown Does Not Support Stub Mode](../guide/faq.md#stub-mode) for background on why watch mode is the recommended alternative to stub mode.
