## foo.js

```js
//#region src/foo.ts
const foo = 1;

//#endregion
export { foo };
```

## index.js

```js
import { foo } from "./foo.js";
import { bar } from "./utils/bar.js";

export { bar, foo };
```

## utils/bar.js

```js
//#region src/utils/bar.ts
const bar = 2;

//#endregion
export { bar };
```
