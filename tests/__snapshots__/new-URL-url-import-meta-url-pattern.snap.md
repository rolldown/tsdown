## assets/mod-BCOeK2IZ.ts

```ts
export const foo = 42
```

## assets/text-gNTN1G_6.txt

```txt
Just some text
```

## index.js

```js
const modUrl = new URL("assets/mod-BCOeK2IZ.ts", import.meta.url);
const textUrl = new URL("assets/text-gNTN1G_6.txt", import.meta.url);
export { modUrl, textUrl };

```
