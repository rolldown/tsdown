## a.mjs

```mjs
import { t as shared_default } from "./shared-DXaYTfQF.mjs";
//#region a.ts
console.log(shared_default() + 1);
//#endregion
export {};

```

## b.mjs

```mjs
import { t as shared_default } from "./shared-DXaYTfQF.mjs";
//#region b.ts
console.log(shared_default() + 2);
//#endregion
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

## shared-DXaYTfQF.mjs

```mjs
//#region shared.ts
function shared_default() {
	return 3;
}
//#endregion
export { shared_default as t };

```
