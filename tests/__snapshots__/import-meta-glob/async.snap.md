## a-vryVd6Q_.mjs

```mjs
//#region modules/a.ts
const a = 1;

//#endregion
export { a };
```

## b-BYyHup1r.mjs

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
	"./modules/a.ts": () => import("./a-vryVd6Q_.mjs"),
	"./modules/b.ts": () => import("./b-BYyHup1r.mjs")
});

//#endregion
export { modules };
```
