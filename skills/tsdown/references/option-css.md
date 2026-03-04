# CSS Support

**Status: Experimental — API and behavior may change.**

Configure CSS handling including preprocessors, syntax lowering, minification, and code splitting.

## Architecture: Basic vs Advanced

- **Built-in (basic):** CSS extraction and bundling — no extra dependencies.
- **Advanced (`@tsdown/css`):** Preprocessors, syntax lowering, minification, `@import` inlining — install `@tsdown/css`.

```bash
npm install -D @tsdown/css
```

When installed, the advanced plugin replaces the built-in one automatically.

## CSS Import

Import `.css` files from TypeScript/JavaScript — CSS is extracted into separate `.css` assets:

```ts
// src/index.ts
import './style.css'
export function greet() { return 'Hello' }
```

Output: `index.mjs` + `index.css`

### `@import` Inlining (requires `@tsdown/css`)

CSS `@import` statements are resolved and inlined automatically. No separate output files produced.

## CSS Pre-processors (requires `@tsdown/css`)

Built-in support for Sass, Less, and Stylus. Install the preprocessor:

```bash
# Sass (either one)
npm install -D sass-embedded  # recommended, faster
npm install -D sass

# Less
npm install -D less

# Stylus
npm install -D stylus
```

Then import directly:

```ts
import './style.scss'
import './theme.less'
import './global.styl'
```

### Preprocessor Options

```ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `$brand-color: #ff7e17;`,
      },
      less: {
        math: 'always',
      },
      stylus: {
        define: { '$brand-color': '#ff7e17' },
      },
    },
  },
})
```

### `additionalData`

Inject code at the beginning of every preprocessor file:

```ts
// String form
scss: {
  additionalData: `@use "src/styles/variables" as *;`,
}

// Function form
scss: {
  additionalData: (source, filename) => {
    if (filename.includes('theme')) return source
    return `@use "src/styles/variables" as *;\n${source}`
  },
}
```

## CSS Minification (requires `@tsdown/css`)

```ts
export default defineConfig({
  css: {
    minify: true,
  },
})
```

Powered by Lightning CSS.

## CSS Target (requires `@tsdown/css`)

Override the top-level `target` specifically for CSS:

```ts
export default defineConfig({
  target: 'node18',
  css: {
    target: 'chrome90', // CSS-specific target
  },
})
```

Set `css.target: false` to disable CSS syntax lowering entirely.

## CSS Transformer (requires `@tsdown/css`)

`css.transformer` controls mutually exclusive CSS processing paths:

- `'lightningcss'` (default): `@import` via Lightning CSS `bundleAsync()`, no PostCSS.
- `'postcss'`: `@import` via `postcss-import`, PostCSS plugins applied, Lightning CSS for final transform only.

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
  },
})
```

### PostCSS Options

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
    postcss: {
      plugins: [require('autoprefixer')],
    },
    // Or: postcss: './config' — path to search for postcss.config.js
  },
})
```

Auto-detects PostCSS config from project root when `transformer` is `'postcss'` and `css.postcss` is omitted.

## Lightning CSS (Syntax Lowering, requires `@tsdown/css`)

Install `lightningcss` to enable CSS syntax lowering based on your `target`:

```bash
npm install -D lightningcss
```

When `target` is set (e.g., `target: 'chrome108'`), modern CSS features are automatically downleveled:

```css
/* Input */
.foo { & .bar { color: red } }

/* Output (chrome108) */
.foo .bar { color: red }
```

### Custom Lightning CSS Options

```ts
import { Features } from 'lightningcss'

export default defineConfig({
  css: {
    lightningcss: {
      targets: { chrome: 100 << 16 },
      include: Features.Nesting,
    },
  },
})
```

`css.lightningcss.targets` takes precedence over both `target` and `css.target` for CSS.

## Code Splitting

### Merged (Default)

All CSS merged into a single file (default: `style.css`).

```ts
export default defineConfig({
  css: {
    fileName: 'my-library.css', // Custom name (default: 'style.css')
  },
})
```

### Per-Chunk Splitting

```ts
export default defineConfig({
  css: {
    splitting: true, // Each JS chunk gets a corresponding .css file
  },
})
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `css.transformer` | `'postcss' \| 'lightningcss'` | `'lightningcss'` | CSS processing pipeline (requires `@tsdown/css`) |
| `css.splitting` | `boolean` | `false` | Per-chunk CSS splitting |
| `css.fileName` | `string` | `'style.css'` | Merged CSS file name |
| `css.minify` | `boolean` | `false` | CSS minification (requires `@tsdown/css`) |
| `css.target` | `string \| string[] \| false` | _from `target`_ | CSS-specific lowering target (requires `@tsdown/css`) |
| `css.postcss` | `string \| object` | — | PostCSS config path or inline options (requires `@tsdown/css`) |
| `css.preprocessorOptions` | `object` | — | Preprocessor options (requires `@tsdown/css`) |
| `css.lightningcss` | `object` | — | Lightning CSS options (requires `@tsdown/css`) |

## Related

- [Target](option-target.md) - Configure syntax lowering targets
- [Output Format](option-output-format.md) - Module output formats
