## a.mjs

```mjs
import { t as shared_default } from "./shared-BTs81KGy.mjs";

//#region a.ts
console.log(shared_default() + 1);

//#endregion
export {  };
```

## b.mjs

```mjs
import { t as shared_default } from "./shared-BTs81KGy.mjs";

//#region b.ts
console.log(shared_default() + 2);

//#endregion
export {  };
```

## c.css

```css

            body { background: black }
            body { color: red }
          

```

## c.mjs

```mjs
export {  };
```

## d.css

```css

            body { background: black }
            body { color: blue }
          

```

## d.mjs

```mjs
export {  };
```

## shared-BTs81KGy.mjs

```mjs
//#region shared.ts
function shared_default() {
	return 3;
}

//#endregion
export { shared_default as t };
```
