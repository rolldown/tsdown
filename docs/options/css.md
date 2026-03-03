# CSS Support

CSS support in `tsdown` is still an experimental feature. While it covers the core use cases, the API and behavior may change in future releases.

> [!WARNING] Experimental Feature
> CSS support is experimental. Please test thoroughly and report any issues you encounter. The API and behavior may change as the feature matures.

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

## CSS Pre-processors

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

## Lightning CSS

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
> When `css.lightningcss.targets` is set, it takes precedence over the top-level `target` option for CSS transformations.

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

| Option                    | Type      | Default       | Description                                                    |
| ------------------------- | --------- | ------------- | -------------------------------------------------------------- |
| `css.splitting`           | `boolean` | `false`       | Enable CSS code splitting per chunk                            |
| `css.fileName`            | `string`  | `'style.css'` | File name for the merged CSS file (when `splitting: false`)    |
| `css.preprocessorOptions` | `object`  | —             | Options for CSS preprocessors (scss, sass, less, styl, stylus) |
| `css.lightningcss`        | `object`  | —             | Options passed to Lightning CSS for syntax lowering            |
