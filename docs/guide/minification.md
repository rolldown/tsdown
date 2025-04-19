# Minification

Minification is the process of compressing your code to reduce its size and improve performance by removing unnecessary characters, such as whitespace, comments, and unused code.

You can enable minification in `tsdown` using the `--minify` option:

```bash
tsdown --minify
```

### Example

Given the following input code:

```ts [src/index.ts]
const x = 1

function hello(x: number) {
  console.log('Hello World')
  console.log(x)
}

hello(x)
```

Here are the two possible outputs, depending on whether minification is enabled:

::: code-group

```js [dist/index.mjs (without --minify)]
//#region src/index.ts
const x = 1
function hello(x$1) {
  console.log('Hello World')
  console.log(x$1)
}
hello(x)

//#endregion
```

<!-- prettier-ignore -->
```js [dist/index.mjs (with --minify)]
const e=1;function t(e){console.log(`Hello World`),console.log(e)}t(e);
```

:::
