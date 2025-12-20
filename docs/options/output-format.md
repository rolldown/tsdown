# Output Format

By default, `tsdown` generates JavaScript code in the [ESM](https://nodejs.org/api/esm.html) (ECMAScript Module) format. However, you can specify the desired output format using the `--format` option:

```bash
tsdown --format esm # default
```

## Available Formats

- [`esm`](https://nodejs.org/api/esm.html): ECMAScript Module format, ideal for modern JavaScript environments, including browsers and Node.js.
- [`cjs`](https://nodejs.org/api/modules.html): CommonJS format, commonly used in Node.js projects.
- [`iife`](https://developer.mozilla.org/en-US/docs/Glossary/IIFE): Immediately Invoked Function Expression, suitable for embedding in `<script>` tags or standalone browser usage.
- [`umd`](https://github.com/umdjs/umd): Universal Module Definition, a format that works on AMD, CommonJS, and global variables.

### Example

```bash
# Generate ESM output (default)
tsdown --format esm

# Generate both ESM and CJS outputs
tsdown --format esm --format cjs

# Generate IIFE output for browser usage
tsdown --format iife
```

> [!TIP]
> You can specify multiple formats in a single command to generate outputs for different environments. For example, combining `esm` and `cjs` ensures compatibility with both modern and legacy systems.

## Overriding Configuration by Format

You can override specific configuration options for each output format by setting `format` as an object in your config file. This allows you to tailor settings such as `target` or other options for each format individually.

```ts
export default defineConfig({
  entry: ['./src/index.js'],
  format: {
    esm: {
      target: ['es2015'],
    },
    cjs: {
      target: ['node20'],
    },
  },
})
```

In this example, the ESM output will target ES2015, while the CJS output will target Node.js 20. This approach gives you fine-grained control over the build process for different module formats.

## CSS Code Splitting

By default, CSS code splitting is preserved (`cssCodeSplit: true`), meaning CSS imported in async JS chunks will be preserved as separate chunks. When set to `false`, all CSS in the project is merged into a single `style.css` file.

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  cssCodeSplit: false, // Merge all CSS into style.css
})
```

**Default** (`cssCodeSplit: true`): CSS imported in async JS chunks will be preserved as separate chunks.
**With `cssCodeSplit: false`**: All CSS is merged into a single `style.css` file, ordered by chunk dependencies.
