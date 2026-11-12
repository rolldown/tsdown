## base-CUgYqGsW.mjs

```mjs
//#region base.ts
const buttonReset = "button-reset";
//#endregion
export { buttonReset as t };

```

## index.mjs

```mjs
import { t as buttonReset } from "./base-CUgYqGsW.mjs";
//#region index.ts
const navItem = buttonReset + " nav-item";
//#endregion
export { navItem };

```

## other.mjs

```mjs
import { t as buttonReset } from "./base-CUgYqGsW.mjs";
export { buttonReset };

```

## style.css

```css
.button-reset {
  padding: 0;
}
.nav-item {
  padding: 12px;
}

```
