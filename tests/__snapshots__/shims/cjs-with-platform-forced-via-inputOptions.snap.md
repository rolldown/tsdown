## index.cjs

```cjs
// index.ts
var cjs_with_platform_forced_via_inputOptions_default = [
	__dirname,
	__filename,
	require("url").pathToFileURL(__filename).href,
	__filename,
	__dirname,
	{}.something
];
module.exports = cjs_with_platform_forced_via_inputOptions_default;

```
