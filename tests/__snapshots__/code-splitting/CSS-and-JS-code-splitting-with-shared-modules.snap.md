## a.mjs

```mjs
import { t as shared_default } from "./shared-2xofchEv.mjs";
// a.ts
console.log(shared_default() + 1);
export {};

```

## b.mjs

```mjs
import { t as shared_default } from "./shared-2xofchEv.mjs";
// b.ts
console.log(shared_default() + 2);
export {};

```

## c.css

```css
body {
  background: #000;
}

body {
  color: red;
}

```

## d.css

```css
body {
  background: #000;
}

body {
  color: #00f;
}

```

## shared-2xofchEv.mjs

```mjs
// shared.ts
function shared_default() {
	return 3;
}
export { shared_default as t };

```
