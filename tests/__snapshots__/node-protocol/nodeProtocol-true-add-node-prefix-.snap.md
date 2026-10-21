## index.mjs

```mjs
import fs from "node:fs";
import { join } from "node:path";
import * as crypto from "node:crypto";
// index.ts
const promise = import("node:fs/promises");
export { crypto, fs, join, promise };

```
