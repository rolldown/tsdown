## index.mjs

```mjs
import { createRequire } from "module";
//#endregion
//#region index.ts
const fn = (/* @__PURE__ */ createRequire(import.meta.url)).resolve;
//#endregion
export { fn };

```
