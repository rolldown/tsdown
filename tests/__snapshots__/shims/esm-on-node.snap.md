## index.js

```js
import path from "node:path";
import { fileURLToPath } from "node:url";

//#region ../../../../esm-shims.js
const getFilename = () => fileURLToPath(import.meta.url);
const getDirname = () => path.dirname(getFilename());
const __dirname = /* @__PURE__ */ getDirname();
const __filename = /* @__PURE__ */ getFilename();

//#endregion
//#region index.ts
var esm_on_node_default = [
	__dirname,
	__filename,
	import.meta.url,
	import.meta.filename,
	import.meta.dirname,
	import.meta.something
];

//#endregion
export { esm_on_node_default as default };
```
