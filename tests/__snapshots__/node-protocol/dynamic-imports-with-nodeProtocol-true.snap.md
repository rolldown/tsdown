## index.js

```js
//#region index.ts
async function loadBuiltins() {
	return {
		fs: await import("node:fs"),
		path: await import("node:path")
	};
}

//#endregion
export { loadBuiltins };
```
