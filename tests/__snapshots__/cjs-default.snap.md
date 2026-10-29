## index.cjs

```cjs
// index.ts
function hello() {
	console.log("Hello!");
}
module.exports = hello;

```

## index.d.cts

```cts
declare function hello(): void;
export = hello;
```

## index.d.mts

```mts
export default function hello(): void;
```

## index.mjs

```mjs
// index.ts
function hello() {
	console.log("Hello!");
}
export { hello as default };

```
