## a.mjs

```mjs
export { t as shared } from "./shared.mjs";
export * from "cac";

```

## b.mjs

```mjs
export { t as shared } from "./shared.mjs";

```

## shared.mjs

```mjs
//#region shared.ts
const shared = 1;
//#endregion
export { shared as t };

```
