## a.mjs

```mjs
import "./shared-HU1X1Fwc.mjs";
// a.ts
const a = 1;
export { a };

```

## b.mjs

```mjs
import "./shared-HU1X1Fwc.mjs";
// b.ts
const b = 2;
export { b };

```

## c.mjs

```mjs
import "./register-CTzf4skp.mjs";
// c.ts
const c = 3;
export { c };

```

## register-CTzf4skp.mjs

```mjs
// register.ts
globalThis.registered = true;
export {};

```

## shared-HU1X1Fwc.mjs

```mjs
import "./style.css";
import "./register-CTzf4skp.mjs";
import "polyfill";
export {};

```

## style.css

```css
.shared {
  color: red;
}

```
