## index.mjs

```mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
// ../../../../esm-shims.js
const getFilename = () => fileURLToPath(import.meta.url);
const getDirname = () => path.dirname(getFilename());
// index.ts
var esm_on_node_default = [
	/* @__PURE__ */ getDirname(),
	/* @__PURE__ */ getFilename(),
	import.meta.url,
	import.meta.filename,
	import.meta.dirname,
	import.meta.something
];
export { esm_on_node_default as default };

```
