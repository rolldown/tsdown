## foo.mjs

```mjs
// src/foo.ts
const foo = 1;
export { foo };

```

## index.mjs

```mjs
import { foo } from "./foo.mjs";
import { bar } from "./utils/bar.mjs";
export { bar, foo };

```

## utils/bar.mjs

```mjs
// src/utils/bar.ts
const bar = 2;
export { bar };

```
