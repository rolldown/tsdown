## foo.mjs

```mjs
//#region src/foo.ts
const foo = 1;

//#endregion
export { foo };
```

## index.mjs

```mjs
import { foo } from "./foo.mjs";
import { bar } from "./utils/bar.mjs";

export { bar, foo };
```

## utils/bar.mjs

```mjs
//#region src/utils/bar.ts
const bar = 2;

//#endregion
export { bar };
```
