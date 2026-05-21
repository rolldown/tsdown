## a-D-bM0MET.mjs

```mjs
//#region modules/a.ts
const a = 1;
//#endregion
export { a };

```

## b-CO3BbCuS.mjs

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
	"./modules/a.ts": () => import("./a-D-bM0MET.mjs"),
	"./modules/b.ts": () => import("./b-CO3BbCuS.mjs")
});
//#endregion
export { modules };

```
