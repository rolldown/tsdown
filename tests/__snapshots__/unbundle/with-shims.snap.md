## mod-a.mjs

```mjs
import 'node:path';
import 'node:url';
import.meta.url;
import { chunk as e } from './shared.mjs';
export { e as chunk };

```

## mod-b.mjs

```mjs
import 'node:path';
import 'node:url';
import.meta.url;
import { chunk as e } from './shared.mjs';
export { e as chunk };

```

## shared.mjs

```mjs
import e from 'node:path';
import t from 'node:url';
const n = t.fileURLToPath(import.meta.url),
  r = [e.dirname(n), n];
export { r as chunk };

```
