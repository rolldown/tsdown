## index.mjs

```mjs
import { main } from "my-dep";
import { lt } from "my-dep/functions/lt";
// local.ts
const local = 1;
export { local, lt, main };

```
