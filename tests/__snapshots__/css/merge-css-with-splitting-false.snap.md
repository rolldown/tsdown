## async-la_KkjCS.mjs

```mjs
export {};

```

## index.css

```css
body {
  color: red;
}
.async {
  color: #00f;
}

```

## index.mjs

```mjs
//#region index.ts
const loadAsync = () => import("./async-la_KkjCS.mjs");
//#endregion
export { loadAsync };

```
