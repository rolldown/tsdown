## async-la_KkjCS.css

```css
.async {
  color: #00f;
}

```

## async-la_KkjCS.mjs

```mjs
export {};

```

## index.css

```css
body {
  color: red;
}

```

## index.mjs

```mjs
//#region index.ts
const loadAsync = () => import("./async-la_KkjCS.mjs");
//#endregion
export { loadAsync };

```
