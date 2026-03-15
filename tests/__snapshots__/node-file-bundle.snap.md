## assets/binding-BaUr1jMm.node

```node
fake-native-addon-binary-content
```

## index.mjs

```mjs
import { createRequire } from "node:module";
//#endregion
//#region index.ts
const native = (/* @__PURE__ */ createRequire(import.meta.url))("./assets/binding-BaUr1jMm.node");
//#endregion
export { native };

```
