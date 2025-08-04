# Output Format

By default, `tsdown` generates JavaScript code in the [ESM](https://nodejs.org/api/esm.html) (ECMAScript Module) format. However, you can specify the desired output format using the `--format` option:

```bash
tsdown --format esm # default
```

### Available Formats

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
