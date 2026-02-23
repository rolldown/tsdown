## index.mjs

```mjs
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) {
		__defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	}
	if (!no_symbols) {
		__defProp(target, Symbol.toStringTag, { value: "Module" });
	}
	return target;
};

//#endregion
//#region modules/a.ts
var a_exports = /* @__PURE__ */ __exportAll({ a: () => a });
const a = 1;

//#endregion
//#region modules/b.ts
var b_exports = /* @__PURE__ */ __exportAll({ b: () => b });
const b = 2;

//#endregion
//#region index.ts
const modules = /* @__PURE__ */ Object.assign({
	"./modules/a.ts": a_exports,
	"./modules/b.ts": b_exports
});

//#endregion
export { modules };
```
