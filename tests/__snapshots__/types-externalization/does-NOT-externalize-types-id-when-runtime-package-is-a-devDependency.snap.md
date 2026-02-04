## index.d.mts

```mts
//#region node_modules/@types/lodash/index.d.ts
declare function debounce<T extends (...args: any) => any>(func: T, wait?: number): T;
//#endregion
//#region index.d.ts
type Debounce = typeof debounce;
//#endregion
export { Debounce };
```
