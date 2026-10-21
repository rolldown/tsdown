## a-BwhqGzEK.mjs

```mjs
// modules/a.ts
const a = 1;
export { a };

```

## b-V3FomBPn.mjs

```mjs
// modules/b.ts
const b = 2;
export { b };

```

## index.mjs

```mjs
// index.ts
const modules = /* #__PURE__ */ Object.assign({
	"./modules/a.ts": () => import("./a-BwhqGzEK.mjs"),
	"./modules/b.ts": () => import("./b-V3FomBPn.mjs")
});
export { modules };

```
