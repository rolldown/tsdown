# Copy Files

The `copy` option copies static files and directories into your build output. It
is useful for assets that should be distributed without being processed by the
bundler, such as images, fonts, and license files.

## Using the CLI

Pass a directory to `--copy` to copy it into the output directory:

```bash
tsdown --copy public
```

With the default `outDir` of `dist`, a file at `public/favicon.svg` is copied to
`dist/public/favicon.svg`.

## Using the Config File

The simplest configuration is a path or glob pattern:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: 'public',
})
```

You can provide multiple paths, glob patterns, or object entries in an array:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: [
    'LICENSE',
    {
      from: ['public/**/*', '!public/**/*.map'],
      to: 'dist/assets',
      flatten: false,
    },
  ],
})
```

Glob patterns support negation with a leading `!`. In this example, files below
`public` are copied to `dist/assets` with their relative directory structure
preserved, while source map files are excluded.

> [!NOTE]
> Relative source and destination paths are resolved from the project root
> (`cwd`), not from `outDir`.

## Object Options

Object entries support the following properties:

| Property  | Type                                                | Default  | Description                                                                                                        |
| --------- | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `from`    | `string \| string[]`                                | Required | A source path or glob pattern. An array can include negated patterns.                                              |
| `to`      | `string`                                            | `outDir` | The destination path, resolved from the project root.                                                              |
| `flatten` | `boolean`                                           | `true`   | Places matched files directly in `to`. Set to `false` to preserve the directory structure below the first segment. |
| `rename`  | `string \| ((name, extension, fullPath) => string)` | —        | Changes the destination name. The callback receives the extension without a leading dot and the absolute path.     |
| `verbose` | `boolean`                                           | `false`  | Logs each copied source and destination.                                                                           |

### Preserve Directory Structure

Glob matches are flattened into the destination by default. Set
`flatten: false` to keep their relative structure:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: {
    from: 'assets/**/*',
    to: 'dist/public',
    flatten: false,
  },
})
```

For example, `assets/fonts/inter.woff2` is copied to
`dist/public/fonts/inter.woff2`.

### Rename Copied Items

Use a string or a callback to rename copied items:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: [
    {
      from: 'src/file.txt',
      to: 'dist',
      rename: 'file.md',
    },
    {
      from: 'src/file.txt',
      to: 'dist',
      rename: (name, extension) => `${name}-renamed.${extension}`,
    },
  ],
})
```

This creates `dist/file.md` and `dist/file-renamed.txt`.

## Dynamic Configuration

`copy` can also be a synchronous or asynchronous callback. It receives the
resolved tsdown configuration and returns the same string, object, or array
forms:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  copy: ({ outDir }) => ({
    from: ['assets/**/*', '!assets/**/*.map'],
    to: `${outDir}/assets`,
    flatten: false,
  }),
})
```

## Build and Watch Behavior

Copying runs after the bundle output is produced. Static files are copied
without passing through Rolldown transforms. A top-level `copy` option runs only
once for a multi-format build; a format-specific override can define `copy`
again for that format.

In watch mode, matched source files are watched as build dependencies. Changing
one triggers a rebuild and copies the current files again.
