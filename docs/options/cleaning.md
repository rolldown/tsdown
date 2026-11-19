# Cleaning

By default, `tsdown` will **clean the output directory** (`outDir`) before each build. This ensures that any files from previous builds are removed, preventing outdated or unused files from remaining in your output.

If you want to disable this behavior and keep existing files in the output directory, you can use the `--no-clean` option:

```bash
tsdown --no-clean
```

> [!NOTE]
> By default, all files in the output directory will be removed before the build process begins. Make sure this behavior aligns with your project requirements to avoid accidentally deleting important files.
>
> Paths outside the project root are never cleaned, and tsdown does not delete files through a symbolic link that points outside the project root. If tsdown skips a matched path for this reason, it logs a warning.
