## async-a-Bq-F8wRV.css

```css
.a {
  color: #00f;
}

```

## async-a-Bq-F8wRV.mjs

```mjs
import "./async-a-Bq-F8wRV.css";
import "./shared-msdYkXJ-.css";
// async-a.ts
const a = 1;
export { a };

```

## async-b-rzSHf1er.mjs

```mjs
import "./shared-msdYkXJ-.css";
// async-b.ts
const b = 2;
export { b };

```

## index.mjs

```mjs
// index.ts
const loadA = () => import("./async-a-Bq-F8wRV.mjs");
const loadB = () => import("./async-b-rzSHf1er.mjs");
export { loadA, loadB };

```

## shared-msdYkXJ-.css

```css
.shared {
  color: red;
}

```
