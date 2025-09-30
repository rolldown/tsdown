## index.js

```js
import fs from "node:fs";
import { join } from "node:path";
import * as crypto from "node:crypto";

//#region index.ts
const promise = import("node:fs/promises");

//#endregion
export { crypto, fs, join, promise };
```
