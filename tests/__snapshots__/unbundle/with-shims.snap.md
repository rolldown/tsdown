## mod-a.mjs

```mjs
import 'node:path';
import 'node:url';
import.meta.url;
export { chunk } from './shared.mjs';

```

## mod-b.mjs

```mjs
import 'node:path';
import 'node:url';
import.meta.url;
export { chunk } from './shared.mjs';

```

## shared.mjs

```mjs
import e from 'node:path';
import t from 'node:url';
const n = /* @__PURE__ */ t.fileURLToPath(import.meta.url),
  r = [/* @__PURE__ */ e.dirname(n), n];
export { r as chunk };

```
