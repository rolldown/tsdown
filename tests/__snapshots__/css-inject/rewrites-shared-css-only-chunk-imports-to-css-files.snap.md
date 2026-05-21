## async-a-DAFWDwf6.css

```css
.a {
  color: #00f;
}

```

## async-a-DAFWDwf6.mjs

```mjs
import './async-a-DAFWDwf6.css';
import "./shared-la_KkjCS.css";
//#region async-a.ts
const a = 1;
//#endregion
export { a };

```

## async-b-D9ELMaDM.mjs

```mjs
import "./shared-la_KkjCS.css";
//#region async-b.ts
const b = 2;
//#endregion
export { b };

```

## index.mjs

```mjs
//#region index.ts
const loadA = () => import("./async-a-DAFWDwf6.mjs");
const loadB = () => import("./async-b-D9ELMaDM.mjs");
//#endregion
export { loadA, loadB };

```

## shared-la_KkjCS.css

```css
.shared {
  color: red;
}

```
