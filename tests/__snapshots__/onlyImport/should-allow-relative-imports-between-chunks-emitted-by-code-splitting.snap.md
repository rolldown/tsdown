## a.mjs

```mjs
import { t as shared } from "./shared.mjs";
export * from "cac";
export { shared };

```

## b.mjs

```mjs
import { t as shared } from "./shared.mjs";
export { shared };

```

## shared.mjs

```mjs
//#region shared.ts
const shared = 1;
//#endregion
export { shared as t };

```
