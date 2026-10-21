## index.mjs

```mjs
import { version } from "./package.mjs";
import { bar } from "./utils/bar.mjs";
export { bar, version };

```

## package.mjs

```mjs
// package.json
var version = "0.0.0";
export { version };

```

## utils/bar.mjs

```mjs
// src/utils/bar.ts
const bar = 2;
export { bar };

```
