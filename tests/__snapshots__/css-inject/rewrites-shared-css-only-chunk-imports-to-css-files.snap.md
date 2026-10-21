## async-a-DxZaYA0i.css

```css
.a {
  color: #00f;
}

```

## async-a-DxZaYA0i.mjs

```mjs
import './async-a-DxZaYA0i.css';
import "./shared-la_KkjCS.css";
// async-a.ts
const a = 1;
export { a };

```

## async-b-CtX62dOP.mjs

```mjs
import "./shared-la_KkjCS.css";
// async-b.ts
const b = 2;
export { b };

```

## index.mjs

```mjs
// index.ts
const loadA = () => import("./async-a-DxZaYA0i.mjs");
const loadB = () => import("./async-b-CtX62dOP.mjs");
export { loadA, loadB };

```

## shared-la_KkjCS.css

```css
.shared {
  color: red;
}

```
