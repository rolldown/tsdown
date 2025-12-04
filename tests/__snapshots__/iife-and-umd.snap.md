## index.iife.js

```js
var Lib = (function(exports) {


//#region index.ts
	const foo = true;

//#endregion
exports.foo = foo;
return exports;
})({});
```

## index.umd.js

```js
(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.Lib = {})));
})(this, function(exports) {

//#region index.ts
	const foo = true;

//#endregion
exports.foo = foo;
});
```
