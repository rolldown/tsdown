# CSS Support

CSS support in `tsdown` is still an experimental feature. While it covers the core use cases, the API and behavior may change in future releases.

> [!WARNING] Experimental Feature
> CSS support is experimental. Please test thoroughly and report any issues you encounter. The API and behavior may change as the feature matures.

## Basic vs Advanced CSS

`tsdown` provides two levels of CSS support:

- **Built-in (basic):** CSS file extraction and bundling works out of the box — no extra dependencies needed.
- **Advanced (`@tsdown/css`):** Preprocessors (Sass/Less/Stylus), CSS syntax lowering, minification, and `@import` inlining require the `@tsdown/css` package:

```bash
npm install -D @tsdown/css
```

When `@tsdown/css` is installed, the advanced CSS plugin is automatically used in place of the built-in one.

## CSS Import

Importing `.css` files from your TypeScript or JavaScript entry points is supported out of the box. The CSS content is extracted and emitted as a separate `.css` asset file:

```ts
// src/index.ts
import './style.css'

export function greet() {
  return 'Hello'
}
```

This produces both `index.mjs` and `index.css` in the output directory.

### `@import` Inlining

When `@tsdown/css` is installed, CSS `@import` statements are automatically resolved and inlined into the output. This means you can use `@import` to organize your CSS across multiple files without producing separate output files:

```css
/* style.css */
@import './reset.css';
@import './theme.css';

.main {
  color: red;
}
```

All imported CSS is bundled into a single output file with `@import` statements removed.

## CSS Pre-processors

> [!NOTE]
> Requires `@tsdown/css` to be installed.

`tsdown` provides built-in support for `.scss`, `.sass`, `.less`, `.styl`, and `.stylus` files. The corresponding pre-processor must be installed as a dev dependency:

::: code-group

```sh [Sass]
# Either sass-embedded (recommended, faster) or sass
npm install -D sass-embedded
# or
npm install -D sass
```

```sh [Less]
npm install -D less
```

```sh [Stylus]
npm install -D stylus
```

:::

Once installed, you can import preprocessor files directly:

```ts
import './style.scss'
import './theme.less'
import './global.styl'
```

### Preprocessor Options

You can pass options to each preprocessor via `css.preprocessorOptions`:

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
    },
  },
})
```

#### `additionalData`

Each preprocessor supports an `additionalData` option to inject extra code at the beginning of every processed file. This is useful for global variables or mixins:

```ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // String — prepended to every .scss file
        additionalData: `@use "src/styles/variables" as *;`,
      },
    },
  },
})
```

You can also use a function for dynamic injection:

```ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (source, filename) => {
          if (filename.includes('theme')) return source
          return `@use "src/styles/variables" as *;\n${source}`
        },
      },
    },
  },
})
```

## CSS Minification

> [!NOTE]
> Requires `@tsdown/css` to be installed.

Enable CSS minification via `css.minify`:

```ts
export default defineConfig({
  css: {
    minify: true,
  },
})
```

Minification is powered by [Lightning CSS](https://lightningcss.dev/).

## CSS Target

> [!NOTE]
> Requires `@tsdown/css` to be installed.

By default, CSS syntax lowering uses the top-level [`target`](/options/target) option. You can override this specifically for CSS with `css.target`:

```ts
export default defineConfig({
  target: 'node18',
  css: {
    target: 'chrome90', // CSS-specific target
  },
})
```

Set `css.target: false` to disable CSS syntax lowering entirely, even when a top-level `target` is set:

```ts
export default defineConfig({
  target: 'chrome90',
  css: {
    target: false, // Preserve modern CSS syntax
  },
})
```

## CSS Transformer

> [!NOTE]
> Requires `@tsdown/css` to be installed.

The `css.transformer` option controls how CSS is processed. PostCSS and Lightning CSS are **mutually exclusive** processing paths:

- **`'lightningcss'`** (default): `@import` is resolved by Lightning CSS's `bundleAsync()`, and PostCSS is **not used at all**.
- **`'postcss'`**: `@import` is resolved by [`postcss-import`](https://github.com/postcss/postcss-import), PostCSS plugins are applied, then Lightning CSS is used only for final syntax lowering and minification.

```ts
export default defineConfig({
  css: {
    transformer: 'postcss', // Use PostCSS for @import and plugins
  },
})
```

When using the `'postcss'` transformer, install `postcss` and optionally `postcss-import` for `@import` resolution:

```bash
npm install -D postcss postcss-import
```

### PostCSS Options

Configure PostCSS inline or point to a config file:

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
    postcss: {
      plugins: [require('autoprefixer')],
    },
  },
})
```

Or specify a directory path to search for a PostCSS config file (`postcss.config.js`, etc.):

```ts
export default defineConfig({
  css: {
    transformer: 'postcss',
    postcss: './config', // Search for postcss.config.js in ./config/
  },
})
```

When `css.postcss` is omitted and `transformer` is `'postcss'`, tsdown auto-detects PostCSS config from the project root.

## Lightning CSS

> [!NOTE]
> Requires `@tsdown/css` to be installed.

`tsdown` uses [Lightning CSS](https://lightningcss.dev/) for CSS syntax lowering — transforming modern CSS features into syntax compatible with older browsers based on your `target` setting.

To enable CSS syntax lowering, install `lightningcss`:

::: code-group

```sh [npm]
npm install -D lightningcss
```

```sh [pnpm]
pnpm add -D lightningcss
```

```sh [yarn]
yarn add -D lightningcss
```

```sh [bun]
bun add -D lightningcss
```

:::

Once installed, CSS lowering is enabled automatically when a `target` is set. For example, with `target: 'chrome108'`, CSS nesting `&` selectors will be flattened:

```css
/* Input */
.foo {
  & .bar {
    color: red;
  }
}

/* Output (chrome108) */
.foo .bar {
  color: red;
}
```

### Lightning CSS Options

You can pass additional options to Lightning CSS via `css.lightningcss`:

```ts
import { Features } from 'lightningcss'

export default defineConfig({
  css: {
    lightningcss: {
      // Override browser targets directly (instead of using `target`)
      targets: { chrome: 100 << 16 },
      // Include/exclude specific features
      include: Features.Nesting,
    },
  },
})
```

> [!TIP]
> When `css.lightningcss.targets` is set, it takes precedence over both the top-level `target` and `css.target` options for CSS transformations.

For more information on available options, refer to the [Lightning CSS documentation](https://lightningcss.dev/).

## CSS Code Splitting

### Merged Mode (Default)

By default, all CSS is merged into a single file (default: `style.css`):

```
dist/
  index.mjs
  style.css  ← all CSS merged
```

### Custom File Name

You can customize the merged CSS file name:

```ts
export default defineConfig({
  css: {
    fileName: 'my-library.css',
  },
})
```

### Splitting Mode

To split CSS per chunk — so each JavaScript chunk that imports CSS has a corresponding `.css` file — enable splitting:

```ts
export default defineConfig({
  css: {
    splitting: true,
  },
})
```

```
dist/
  index.mjs
  index.css        ← CSS from index.ts
  async-abc123.mjs
  async-abc123.css ← CSS from async chunk
```

## Options Reference

| Option                    | Type                          | Default         | Description                                                                  |
| ------------------------- | ----------------------------- | --------------- | ---------------------------------------------------------------------------- |
| `css.transformer`         | `'postcss' \| 'lightningcss'` | `'lightningcss'`| CSS processing pipeline (requires `@tsdown/css`)                             |
| `css.splitting`           | `boolean`                     | `false`         | Enable CSS code splitting per chunk                                          |
| `css.fileName`            | `string`                      | `'style.css'`   | File name for the merged CSS file (when `splitting: false`)                  |
| `css.minify`              | `boolean`                     | `false`         | Enable CSS minification (requires `@tsdown/css`)                             |
| `css.target`              | `string \| string[] \| false` | _from `target`_ | CSS-specific syntax lowering target (requires `@tsdown/css`)                 |
| `css.postcss`             | `string \| object`            | —               | PostCSS config path or inline options (requires `@tsdown/css`)               |
| `css.preprocessorOptions` | `object`                      | —               | Options for CSS preprocessors (requires `@tsdown/css`)                       |
| `css.lightningcss`        | `object`                      | —               | Options passed to Lightning CSS for syntax lowering (requires `@tsdown/css`) |
