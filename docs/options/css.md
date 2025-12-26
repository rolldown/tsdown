# CSS Support

CSS support in `tsdown` is still in a very early, experimental stage. While you can use some basic features, please be aware that the API and behavior may change in future releases.

> [!WARNING] Experimental Feature
> CSS support is highly experimental. Please test thoroughly and report any issues you encounter. The API and behavior may change as the feature matures.

## Options

### Disabling CSS Code Splitting

By default, CSS may be split into multiple files based on your entry points. If you want to disable CSS code splitting and generate a single CSS file, you can set `css.splitting` to `false` in your configuration:

```ts
export default defineConfig({
  css: {
    splitting: false,
  },
})
```

### Setting the Output CSS File Name

You can customize the name of the merged CSS file using the `css.fileName` option:

```ts
export default defineConfig({
  css: {
    fileName: 'my-library.css',
  },
})
```

This will output your combined CSS as `my-library.css` in the output directory.
