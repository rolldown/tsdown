## index.cjs

```cjs
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region index.ts
function hello() {
	console.log("Hello!");
}
//#endregion
exports.hello = hello;

```

## index.d.cts

```cts
export * from './index.d.mts'

```

## index.d.mts

```mts
//#region index.d.ts
declare function hello(): void;
//#endregion
export { hello };
```

## index.mjs

```mjs
//#region index.ts
function hello() {
	console.log("Hello!");
}
//#endregion
export { hello };

```
