## async-a-D2jumwQx.cjs

```cjs
require('./async-a-D2jumwQx.css');
require("./shared-BvRk9kiK.css");
// async-a.ts
const a = 1;
exports.a = a;

```

## async-a-D2jumwQx.css

```css
.a {
  color: #00f;
}

```

## async-b-CQRdM_jS.cjs

```cjs
require("./shared-BvRk9kiK.css");
// async-b.ts
const b = 2;
exports.b = b;

```

## index.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
// index.ts
const loadA = () => Promise.resolve().then(() => require("./async-a-D2jumwQx.cjs"));
const loadB = () => Promise.resolve().then(() => require("./async-b-CQRdM_jS.cjs"));
exports.loadA = loadA;
exports.loadB = loadB;

```

## shared-BvRk9kiK.css

```css
.shared {
  color: red;
}

```
