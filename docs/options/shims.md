# Shims

Shims are small pieces of code that provide compatibility between different module systems, such as CommonJS (CJS) and ECMAScript Modules (ESM). In `tsdown`, shims are used to bridge the gap between these systems, ensuring your code runs smoothly across different environments.

## CommonJS Variables in ESM

In CommonJS, `__dirname` and `__filename` are built-in variables that provide the directory and file path of the current module. However, these variables are **not available in ESM** by default.

To improve compatibility, when the `shims` option is enabled and `platform` is set to `node`, `tsdown` will automatically generate these variables for ESM output. For example:

```js
console.log(__dirname) // Available in ESM when shims are enabled
console.log(__filename) // Available in ESM when shims are enabled
```

### Runtime Overhead

The generated shims for `__dirname` and `__filename` introduce a very small runtime overhead. However, if these variables are not used in your code, they will be automatically removed during the bundling process, ensuring no unnecessary code is included.

## The `require` Function in ESM

When using the `require` function in ESM output and the `platform` is set to `node`, `tsdown` will **automatically inject a `require` shim using Node.js's `createRequire`**, regardless of the `shims` option. This ensures that you can use `require` in ESM modules in a Node.js environment without manual setup.

For example:

```js
// const require = createRequire(import.meta.url) [auto injected]

const someModule = require('some-module')
```

This behavior is always enabled for ESM output targeting Node.js, so you don't need to configure anything extra to use `require` in this scenario.

## ESM Variables in CommonJS

Even if the `shims` option is **not enabled**, `tsdown` will automatically shim the following ESM-specific variables in CommonJS output:

- `import.meta.url`
- `import.meta.dirname`
- `import.meta.filename`

These variables are provided to ensure compatibility when using ESM-like features in CommonJS environments. For example:

```js
console.log(import.meta.url)
console.log(import.meta.dirname)
console.log(import.meta.filename)
```

This behavior is always enabled for CommonJS output, so you don't need to configure anything to use these variables.

## Enabling Shims

To enable shims for `__dirname` and `__filename` in ESM output, use the `--shims` option in the CLI or set `shims: true` in the configuration file:

### CLI

```bash
tsdown --shims
```

### Config File

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  shims: true,
})
```
