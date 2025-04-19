# Cleaning

<!-- TODO enable clean by default -->

By default, `tsdown` does not clean the output folder for you. This means that if your bundling process generates files with different names compared to a previous build, the older files will remain in the output directory.

To ensure the output directory is cleaned before building, you can use the `--clean` option:

```bash
tsdown --clean
```

> [!NOTE]
> Using the `--clean` option will remove all files in the output directory before the build process begins. Make sure this behavior aligns with your project requirements to avoid accidentally deleting important files.
