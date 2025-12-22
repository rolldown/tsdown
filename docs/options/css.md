# CSS

Configure CSS generation options for your build output.

By default (`splitting: true`), CSS code splitting is preserved. When disabled, all CSS is merged into a single file (defaults to `style.css` or the specified `fileName`).

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  css: {
    splitting: false, // Merge all CSS into a single file
    fileName: 'index.css', // Optional: custom CSS file name
  },
})
```
