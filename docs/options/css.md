# CSS

Configure CSS generation options for your build output.

## Options

### `splitting`

Enable/disable CSS code splitting.

- **Type**: `boolean`
- **Default**: `true`

When `true`, CSS imported in async JS chunks will be preserved as separate chunks. When `false`, all CSS will be merged into a single file.

### `fileName`

Specify the name of the CSS file when code splitting is disabled.

- **Type**: `string`
- **Default**: `'style.css'`

Only takes effect when `splitting` is `false`.

## Example

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  css: {
    splitting: false, // Merge all CSS into a single file
    fileName: 'index.css', // Optional: custom CSS file name
  },
})
```

By default (`splitting: true`), CSS code splitting is preserved. When disabled, all CSS is merged into a single file (defaults to `style.css` or the specified `fileName`).
