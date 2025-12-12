## index.mjs

```mjs
import fs from "node:fs";
import path from "path";

//#region index.ts
const promise = import("node:fs/promises");

//#endregion
export { fs, path, promise };
```
