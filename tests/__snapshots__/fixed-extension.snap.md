## index.cjs

```cjs

//#region index.ts
var fixed_extension_default = 10;

//#endregion
module.exports = fixed_extension_default;
```

## index.d.cts

```cts
//#region index.d.ts
declare const _default: number;
export = _default;
```

## index.d.mts

```mts
//#region index.d.ts
declare const _default: number;
//#endregion
export { _default as default };
```

## index.mjs

```mjs
//#region index.ts
var fixed_extension_default = 10;

//#endregion
export { fixed_extension_default as default };
```
