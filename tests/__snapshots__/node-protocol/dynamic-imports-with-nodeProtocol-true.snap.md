## index.mjs

```mjs
// index.ts
async function loadBuiltins() {
	return {
		fs: await import("node:fs"),
		path: await import("node:path")
	};
}
export { loadBuiltins };

```
