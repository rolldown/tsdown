## index.mjs

```mjs
//#region rolldown:runtime
var __defProp = Object.defineProperty;
var __export = (all, symbols) => {
	let target = {};
	for (var name in all) {
		__defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	}
	if (symbols) {
		__defProp(target, Symbol.toStringTag, { value: "Module" });
	}
	return target;
};

//#endregion
//#region modules/a.ts
var a_exports = /* @__PURE__ */ __export({ a: () => a });
const a = 1;

//#endregion
//#region modules/b.ts
var b_exports = /* @__PURE__ */ __export({ b: () => b });
const b = 2;

//#endregion
//#region index.ts
const modules = {
	"./modules/a.ts": a_exports,
	"./modules/b.ts": b_exports
};

//#endregion
export { modules };
```
