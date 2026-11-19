## a.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./shared-Dgv-869i.cjs");
// a.ts
const a = 1;
exports.a = a;

```

## b.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./shared-Dgv-869i.cjs");
// b.ts
const b = 2;
exports.b = b;

```

## c.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./register-C9of2vfi.cjs");
// c.ts
const c = 3;
exports.c = c;

```

## register-C9of2vfi.cjs

```cjs
// register.ts
globalThis.registered = true;

```

## shared-Dgv-869i.cjs

```cjs
require("./style.css");
require("./register-C9of2vfi.cjs");
require("polyfill");

```

## style.css

```css
.shared {
  color: red;
}

```
