## async-a-kpBdb-EG.css

```css
.a {
  color: #00f;
}

```

## async-a-kpBdb-EG.mjs

```mjs
import './async-a-kpBdb-EG.css';
import "./shared-93aDPs4w.css";
//#region async-a.ts
const a = 1;
//#endregion
export { a };

```

## async-b-Dy5iQIkB.mjs

```mjs
import "./shared-93aDPs4w.css";
//#region async-b.ts
const b = 2;
//#endregion
export { b };

```

## index.mjs

```mjs
//#region index.ts
const loadA = () => import("./async-a-kpBdb-EG.mjs");
const loadB = () => import("./async-b-Dy5iQIkB.mjs");
//#endregion
export { loadA, loadB };

```

## shared-93aDPs4w.css

```css
.shared {
  color: red;
}

```
