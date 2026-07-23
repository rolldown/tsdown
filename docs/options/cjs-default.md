# CJS Default Export

The `cjsDefault` option helps improve compatibility when generating CommonJS (CJS) entry modules. This option is **enabled by default**.

## How It Works

When an explicit entry module has **only a single default export** and the output format is set to CJS, `tsdown` will automatically transform:

- `export default ...`
  into
  `module.exports = ...` in the generated JavaScript file.

For TypeScript declaration files (`.d.ts`), it will transform:

- `export default ...`
  into
  `export = ...`

This ensures that consumers using CommonJS require syntax (`require('your-module')`) will receive the default export directly, improving interoperability with tools and environments that expect this behavior.

> [!NOTE]
> `cjsDefault` only applies to explicit entry modules. In [unbundle mode](./unbundle.md), imported modules that are emitted as non-entry chunks keep named CJS exports such as `exports.default`. CJS is considered legacy and is supported in maintenance-only mode, so this behavior will not be extended to non-entry chunks.

If every source module is intended to be consumed independently, include all of them as entries:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts'],
  root: 'src',
  format: 'cjs',
  unbundle: true,
})
```

## Example

**Source Module:**

```ts
// src/index.ts
export default function greet() {
  console.log('Hello, world!')
}
```

**Generated CJS Output:**

```js
// dist/index.cjs
function greet() {
  console.log('Hello, world!')
}
module.exports = greet
```

**Generated Declaration File:**

```ts
// dist/index.d.cts
declare function greet(): void
export = greet
```
