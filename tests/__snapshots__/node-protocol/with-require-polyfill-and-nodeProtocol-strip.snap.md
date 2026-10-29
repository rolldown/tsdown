## index.mjs

```mjs
import { createRequire } from "module";
// index.ts
const fn = (/* @__PURE__ */ (() => createRequire(import.meta.url))()).resolve;
export { fn };

```
