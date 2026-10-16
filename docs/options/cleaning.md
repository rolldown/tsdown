# Cleaning

By default, `tsdown` removes **stale files** from the output directory (`outDir`). Files that the build emits again are overwritten in place. Files left over from a previous build, and nothing else that the new build produced, are deleted only after the new output is on disk.

Watch mode uses the same rule on every successful rebuild. A tool that reads `outDir` while `tsdown --watch` is running (Vite, Nest, `tsc --watch`) keeps seeing the previous files until each one is replaced. The directory is not emptied first.

A one-shot build of a single configuration works the same way. When several one-shot configurations are built together, their clean targets are wiped **before** emit, so those builds can write into one shared directory without deleting each other's output afterwards.

Disable cleaning entirely with `--no-clean`:

```bash
tsdown --no-clean
```

> [!NOTE]
> `clean: true` still deletes every file under the clean target that this build did not emit. Do not point it at a directory that contains files you need to keep.
