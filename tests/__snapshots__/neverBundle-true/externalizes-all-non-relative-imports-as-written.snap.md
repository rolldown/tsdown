## index.mjs

```mjs
import { main } from "my-dep";
import { lt } from "my-dep/functions/lt";
//#region local.ts
const local = 1;
//#endregion
export { local, lt, main };

```
