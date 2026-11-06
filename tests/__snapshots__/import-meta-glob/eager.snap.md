## index.mjs

```mjs
// \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, flags) => {
	let target = Object.setPrototypeOf({}, null);
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!(flags & 1)) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return flags & 2 ? target : Object.preventExtensions(target);
};
// index.ts
const modules = /* #__PURE__ */ Object.assign({
	"./modules/a.ts": /* @__PURE__ */ __exportAll({ a: () => 1 }),
	"./modules/b.ts": /* @__PURE__ */ __exportAll({ b: () => 2 })
});
export { modules };

```
