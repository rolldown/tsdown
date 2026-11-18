## index.cjs

```cjs
// index.ts
var custom_dts_extension_with_dtsOnly_and_cjs_format_default = 10;
module.exports = custom_dts_extension_with_dtsOnly_and_cjs_format_default;

```

## index.d.cts

```cts
declare const _default: 10;
export = _default;
```

## index.d.ts

```ts
declare const _default: 10;
export { _default as default };
```

## index.iife.js

```js
(function() {
	return 10;
})();

```
