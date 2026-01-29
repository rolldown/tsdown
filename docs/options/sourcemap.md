# Source Maps

Source maps bridge the gap between your original development code and the optimized code that runs in the browser or other environments, making debugging significantly easier. They allow you to trace errors and logs back to the original source files, even if the code has been minified or bundled.

For example, source maps enable you to identify which line in your React or Vue component caused an error, even though the runtime environment only sees the bundled or minified code.

## Enabling Source Maps

You can instruct `tsdown` to generate source maps by using the `--sourcemap` option:

```bash
tsdown --sourcemap
```

Or in the config file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  sourcemap: true,
})
```

> [!NOTE]
> Source maps will always be enabled if you have [`declarationMap`](https://www.typescriptlang.org/tsconfig/#declarationMap) option enabled in your `tsconfig.json`.

## Source Map Modes

The `sourcemap` option accepts the following values:

| Value      | Description                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `false`    | Disable source maps (default)                                                                                                                                                                                                       |
| `true`     | Generate separate `.map` files alongside the output. A `//# sourceMappingURL` comment is appended to each output file pointing to the `.map` file.                                                                                  |
| `'inline'` | Embed the source map directly in the output file as a base64-encoded data URL. No separate `.map` file is generated. Similar to TypeScript's [`inlineSourceMap`](https://www.typescriptlang.org/tsconfig/#inlineSourceMap).         |
| `'hidden'` | Generate separate `.map` files but **do not** append the `//# sourceMappingURL` comment to the output. Useful when you want source maps available for error monitoring services but don't want browsers to load them automatically. |

### Using the CLI

```bash
# Enable source maps (separate .map files)
tsdown --sourcemap

# Inline source maps
tsdown --sourcemap inline

# Hidden source maps
tsdown --sourcemap hidden
```

### Using the Config File

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // Inline source maps into output files
  sourcemap: 'inline',
})
```

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // Generate .map files without sourceMappingURL comments
  sourcemap: 'hidden',
})
```
