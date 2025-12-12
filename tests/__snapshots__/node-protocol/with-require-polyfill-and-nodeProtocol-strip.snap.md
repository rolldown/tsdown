## index.mjs

```mjs
import { createRequire } from "module";

//#region rolldown:runtime
var __require = /* @__PURE__ */ createRequire(import.meta.url);

//#endregion
//#region index.ts
const fn = __require.resolve;

//#endregion
export { fn };
```
