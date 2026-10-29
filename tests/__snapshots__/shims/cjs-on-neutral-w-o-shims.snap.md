## index.cjs

```cjs
// index.ts
var cjs_on_neutral_w_o_shims_default = [
	__dirname,
	__filename,
	require("url").pathToFileURL(__filename).href,
	__filename,
	__dirname,
	{}.something
];
module.exports = cjs_on_neutral_w_o_shims_default;

```
