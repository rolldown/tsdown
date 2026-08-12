## index.cjs

```cjs
//#region index.ts
function hello() {
	console.log("Hello!");
}
//#endregion
module.exports = hello;

```

## index.d.cts

```cts
//#region index.d.ts
declare function hello(): void;
export = hello;
```

## index.d.mts

```mts
//#region index.d.ts
export default function hello(): void;
//#endregion
```

## index.mjs

```mjs
//#region index.ts
function hello() {
	console.log("Hello!");
}
//#endregion
export { hello as default };

```
