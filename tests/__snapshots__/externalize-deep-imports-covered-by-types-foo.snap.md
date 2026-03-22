## index.d.mts

```mts
import Token from "foo/lib/token.mjs";

//#region node_modules/bar/types/index.d.ts
interface AnchorOptions {
  getTokensText?(tokens: Token[]): string;
}
//#endregion
export { type AnchorOptions };
```

## index.mjs

```mjs
export {};

```
