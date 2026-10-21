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
// shared.ts
const shared = 1;
export { shared as t };

```
