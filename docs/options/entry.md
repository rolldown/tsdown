# Entry

The `entry` option specifies the entry files for your project. These files serve as the starting points for the bundling process. You can define entry files either via the CLI or in the configuration file.

## Using the CLI

You can specify entry files directly as command arguments when using the CLI. For example:

```bash
tsdown src/entry1.ts src/entry2.ts
```

This command will bundle `src/entry1.ts` and `src/entry2.ts` as separate entry points.

## Using the Config File

In the configuration file, the `entry` option allows you to define entry files in various formats:

### Single Entry File

Specify a single entry file as a string:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
})
```

### Multiple Entry Files

Define multiple entry files as an array of strings:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/entry1.ts', 'src/entry2.ts'],
})
```

### Entry Files with Aliases

Use an object to define entry files with aliases. The keys represent alias names, and the values represent file paths:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    main: 'src/index.ts',
    utils: 'src/utils.ts',
  },
})
```

This configuration will create two bundles: one for `src/index.ts` (output as `dist/main.js`) and one for `src/utils.ts` (output as `dist/utils.js`).

## Using Glob Patterns

The `entry` option supports [glob patterns](https://code.visualstudio.com/docs/editor/glob-patterns), enabling you to match multiple files dynamically. For example:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/**/*.ts',
})
```

This configuration will include all `.ts` files in the `src` directory and its subdirectories as entry points.

You can also use glob patterns in arrays, with negation patterns to exclude specific files:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/*.ts', '!src/*.test.ts'],
})
```

### Object Entries with Glob Patterns

When using the object form, you can use glob wildcards (`*`) in both keys and values. The `*` in the key acts as a placeholder that gets replaced with the matched file name (without extension):

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    // Maps src/foo.ts → dist/lib/foo.js, src/bar.ts → dist/lib/bar.js
    'lib/*': 'src/*.ts',
  },
})
```

This is useful for creating output structures that differ from the source layout.

#### Negation Patterns

When using glob keys, values can be an array of patterns including negation patterns (prefixed with `!`) to exclude specific files:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    // Include all hooks except the index file
    'hooks/*': ['src/hooks/*.ts', '!src/hooks/index.ts'],
  },
})
```

#### Multiple Patterns

You can combine multiple positive patterns and multiple negation patterns:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'utils/*': [
      'src/utils/*.ts',
      'src/utils/*.tsx',
      '!src/utils/index.ts',
      '!src/utils/internal.ts',
    ],
  },
})
```

> [!WARNING]
> When using multiple positive patterns in an array value, all patterns must share the same base directory. For example, mixing `src/hooks/*.ts` and `src/utils/*.ts` in a single entry key will throw an error.

#### Mixed Entries

You can mix strings, glob patterns, and object entries in an array:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/*',
    '!src/foo.ts',
    { main: 'index.ts' },
    { 'lib/*': ['src/*.ts', '!src/bar.ts'] },
  ],
})
```

When the same output name appears in both array entries and object entries, the object entry takes precedence.

> [!TIP]
>
> On **Windows**, you must use forward slashes (`/`) instead of backslashes (`\`) in file paths when using glob patterns.
