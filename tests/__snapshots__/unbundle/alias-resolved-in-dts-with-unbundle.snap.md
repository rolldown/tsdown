## apis/getFoo.d.mts

```mts
import { DefaultHeaders } from "../types.mjs";

//#region src/apis/getFoo.d.ts
declare const getFoo: (params: DefaultHeaders) => Promise<Response>;
//#endregion
export { getFoo };
```

## apis/getFoo.mjs

```mjs
//#region src/apis/getFoo.ts
const getFoo = (params) => fetch("/foo");
//#endregion
export { getFoo };

```

## index.d.mts

```mts
import { getFoo } from "./apis/getFoo.mjs";
export { getFoo };
```

## index.mjs

```mjs
import { getFoo } from "./apis/getFoo.mjs";
export { getFoo };

```

## types.d.mts

```mts
//#region src/types.d.ts
interface DefaultHeaders {
  authorization: string;
}
//#endregion
export { DefaultHeaders };
```

## types.mjs

```mjs
export {};

```
