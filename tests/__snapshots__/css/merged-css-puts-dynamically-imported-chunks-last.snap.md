## async-la_KkjCS.mjs

```mjs
export {};

```

## index.mjs

```mjs
import { t as shared } from "./shared-BBeJ3Xtk.mjs";
//#region index.ts
const load = () => import("./async-la_KkjCS.mjs");
//#endregion
export { load, shared };

```

## other.mjs

```mjs
import { t as shared } from "./shared-BBeJ3Xtk.mjs";
export { shared };

```

## shared-BBeJ3Xtk.mjs

```mjs
//#region shared.ts
const shared = 1;
//#endregion
export { shared as t };

```

## style.css

```css
.shared {
  color: green;
}
.index {
  color: red;
}
.async {
  color: #00f;
}

```
