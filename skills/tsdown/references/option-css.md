# CSS Support

**Status: Experimental — API and behavior may change.**

Configure CSS handling including preprocessors, syntax lowering, and code splitting.

## CSS Import

Import `.css` files from TypeScript/JavaScript — CSS is extracted into separate `.css` assets:

```ts
// src/index.ts
import './style.css'
export function greet() { return 'Hello' }
```

Output: `index.mjs` + `index.css`

## CSS Pre-processors

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

## Lightning CSS (Syntax Lowering)

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

`css.lightningcss.targets` takes precedence over the top-level `target` for CSS.

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
| `css.splitting` | `boolean` | `false` | Per-chunk CSS splitting |
| `css.fileName` | `string` | `'style.css'` | Merged CSS file name |
| `css.preprocessorOptions` | `object` | — | Preprocessor options (scss/sass/less/styl/stylus) |
| `css.lightningcss` | `object` | — | Lightning CSS transform options |

## Related

- [Target](option-target.md) - Configure syntax lowering targets
- [Output Format](option-output-format.md) - Module output formats
