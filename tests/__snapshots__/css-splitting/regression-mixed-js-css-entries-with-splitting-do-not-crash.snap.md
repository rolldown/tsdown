## a.mjs

```mjs
import { t as shared } from "./shared-Cfu-3FED.mjs";

//#region a.ts
console.log(shared() + 1);

//#endregion
export {  };
```

## b.mjs

```mjs
import { t as shared } from "./shared-Cfu-3FED.mjs";

//#region b.ts
console.log(shared() + 2);

//#endregion
export {  };
```

## c.css

```css
body { background: black } body { color: red }

```

## c.mjs

```mjs
export {  };
```

## d.css

```css
body { background: black } body { color: blue }

```

## d.mjs

```mjs
export {  };
```

## shared-Cfu-3FED.mjs

```mjs
//#region shared.ts
function shared() {
	return 3;
}

//#endregion
export { shared as t };
```
