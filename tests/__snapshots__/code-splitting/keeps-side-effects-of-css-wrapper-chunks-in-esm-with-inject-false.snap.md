## a.mjs

```mjs
import "./shared-D6Dgssvn.mjs";
// a.ts
const a = 1;
export { a };

```

## b.mjs

```mjs
import "./shared-D6Dgssvn.mjs";
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

## shared-D6Dgssvn.mjs

```mjs
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
