## index.cjs

```cjs
//#region index.ts
var cjs_on_node_with_unbundle_default = [
	__dirname,
	__filename,
	require("url").pathToFileURL(__filename).href,
	__filename,
	__dirname,
	{}.something
];
//#endregion
module.exports = cjs_on_node_with_unbundle_default;

```
