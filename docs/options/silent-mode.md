# Silent Mode

> **Deprecated**: The `--silent` option is deprecated. Use `--log-level silent` instead.

If you want to suppress non-error logs during the bundling process, you can enable **silent mode** by using the `--silent` option:

```bash
tsdown --silent
```

**Recommended approach** using the new `--log-level` option:

```bash
tsdown --log-level silent
```

In silent mode, only error messages will be displayed, making it easier to focus on critical issues during the build process.
