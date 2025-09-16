## index.js

```js
//#region index.ts
async function loadBuiltins() {
	const fs = await import("node:fs");
	const path = await import("node:path");
	return {
		fs,
		path
	};
}

//#endregion
export { loadBuiltins };
```
