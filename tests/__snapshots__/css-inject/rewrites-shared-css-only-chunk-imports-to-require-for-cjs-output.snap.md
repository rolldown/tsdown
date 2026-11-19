## async-a-BCHCFGT7.cjs

```cjs
require("./async-a-BCHCFGT7.css");
require("./shared-CRkVNR4g.css");
// async-a.ts
const a = 1;
exports.a = a;

```

## async-a-BCHCFGT7.css

```css
.a {
  color: #00f;
}

```

## async-b-BWXziA1U.cjs

```cjs
require("./shared-CRkVNR4g.css");
// async-b.ts
const b = 2;
exports.b = b;

```

## index.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
// index.ts
const loadA = () => Promise.resolve().then(() => require("./async-a-BCHCFGT7.cjs"));
const loadB = () => Promise.resolve().then(() => require("./async-b-BWXziA1U.cjs"));
exports.loadA = loadA;
exports.loadB = loadB;

```

## shared-CRkVNR4g.css

```css
.shared {
  color: red;
}

```
