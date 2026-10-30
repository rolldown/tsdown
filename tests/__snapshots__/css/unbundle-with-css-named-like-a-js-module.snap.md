## Card.cjs

```cjs
;/* empty css           */
// Card.ts
const Card = "card";
exports.Card = Card;

```

## card.css

```css
.card {
  color: red;
}

```

## index.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_Card = require("./Card.cjs");
exports.Card = require_Card.Card;

```
