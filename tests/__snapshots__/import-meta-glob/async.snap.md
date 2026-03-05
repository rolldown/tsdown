## a-kqUMr8Rg.mjs

```mjs
//#region modules/a.ts
const a = 1;
//#endregion
export { a };

```

## b-BiVGjAB_.mjs

```mjs
//#region modules/b.ts
const b = 2;
//#endregion
export { b };

```

## index.mjs

```mjs
//#region index.ts
const modules = /* @__PURE__ */ Object.assign({
	"./modules/a.ts": () => import("./a-kqUMr8Rg.mjs"),
	"./modules/b.ts": () => import("./b-BiVGjAB_.mjs")
});
//#endregion
export { modules };

```
