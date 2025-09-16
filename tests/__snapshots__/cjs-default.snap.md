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

## index.d.ts

```ts
//#region index.d.ts
declare function hello(): void;
//#endregion
export { hello as default };
```

## index.js

```js
//#region index.ts
function hello() {
	console.log("Hello!");
}

//#endregion
export { hello as default };
```
