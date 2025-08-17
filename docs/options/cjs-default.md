# CJS Default Export

The `cjsDefault` option helps improve compatibility when generating CommonJS (CJS) modules. This option is **enabled by default**.

## How It Works

When your module has **only a single default export** and the output format is set to CJS, `tsdown` will automatically transform:

- `export default ...`
  into
  `module.exports = ...` in the generated JavaScript file.

For TypeScript declaration files (`.d.ts`), it will transform:

- `export default ...`
  into
  `export = ...`

This ensures that consumers using CommonJS require syntax (`require('your-module')`) will receive the default export directly, improving interoperability with tools and environments that expect this behavior.

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
function hello() {
  console.log('Hello, world!')
}
module.exports = hello
```

**Generated Declaration File:**

```ts
// dist/index.d.cts
declare function hello(): void
export = hello
```
