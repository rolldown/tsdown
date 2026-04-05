## index.mjs

```mjs
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region index.ts
const modules = /* @__PURE__ */ Object.assign({
	"./modules/a.ts": /* @__PURE__ */ __exportAll({ a: () => 1 }),
	"./modules/b.ts": /* @__PURE__ */ __exportAll({ b: () => 2 })
});
//#endregion
export { modules };

```
