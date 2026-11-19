## a.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./shared-ChHVc2_T.cjs");
// a.ts
const a = 1;
exports.a = a;

```

## b.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
require("./shared-ChHVc2_T.cjs");
// b.ts
const b = 2;
exports.b = b;

```

## shared-ChHVc2_T.cjs

```cjs
require("./style.css");
require("polyfill");

```

## style.css

```css
.shared {
  color: red;
}

```
