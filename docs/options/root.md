# Root Directory

The `root` option specifies the root directory of your input files, similar to TypeScript's [`rootDir`](https://www.typescriptlang.org/tsconfig/#rootDir). It determines how the output directory structure is computed from your entry files.

## Default Behavior

By default, `root` is automatically computed as the **common base directory** of all entry files. For example, if your entries are `src/a.ts` and `src/b.ts`, the root will be `src/`.

## How to Configure

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/utils/helper.ts'],
  root: 'src',
})
```

Or via CLI:

```bash
tsdown --root src
```

## How It Works

The `root` option affects two behaviors:

1. **Entry name resolution**: When using array entries, file paths relative to `root` determine the output filenames.
2. **Unbundle mode**: In unbundle mode, `root` is used as the `preserveModulesRoot`, controlling the output directory structure.

### Example

Given the following project structure:

```
project/
  src/
    index.ts
    utils/
      helper.ts
```

#### Without `root` (default behavior)

```ts
export default defineConfig({
  entry: ['src/index.ts', 'src/utils/helper.ts'],
})
```

The common base directory is `src/`, so the output will be:

```
dist/
  index.js
  utils/
    helper.js
```

#### With explicit `root`

```ts
export default defineConfig({
  entry: ['src/index.ts', 'src/utils/helper.ts'],
  root: '.',
})
```

Now the root is the project directory, so the output preserves the `src/` prefix:

```
dist/
  src/
    index.js
    utils/
      helper.js
```

## When to Use

- When the auto-computed common base directory doesn't produce the desired output structure.
- When you want output paths to include or exclude certain directory prefixes.
- When using unbundle mode and need fine-grained control over the output directory mapping.
