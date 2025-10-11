# Source Maps

Source maps bridge the gap between your original development code and the optimized code that runs in the browser or other environments, making debugging significantly easier. They allow you to trace errors and logs back to the original source files, even if the code has been minified or bundled.

For example, source maps enable you to identify which line in your React or Vue component caused an error, even though the runtime environment only sees the bundled or minified code.

### Enabling Source Maps

You can instruct `tsdown` to generate source maps by using the `--sourcemap` option:

```bash
tsdown --sourcemap
```

Note that source map will always be enabled if you have [`declarationMap`](https://www.typescriptlang.org/tsconfig/#declarationMap) option enabled in your `tsconfig.json`.
