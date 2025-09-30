## index.mjs

```mjs
import { version } from "./package.mjs";
import { bar } from "./utils/bar.mjs";

export { bar, version };
```

## package.mjs

```mjs
//#region package.json
var version = "0.0.0";

//#endregion
export { version };
```

## utils/bar.mjs

```mjs
//#region src/utils/bar.ts
const bar = 2;

//#endregion
export { bar };
```
