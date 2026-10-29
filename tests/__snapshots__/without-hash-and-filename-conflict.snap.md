## foo.mjs

```mjs
// utils/foo.ts
const foo$1 = (a) => {
	console.log("utils/foo:" + a);
};
// foo.ts
const foo = (a) => {
	console.log("foo:" + a);
};
export { foo$1 as n, foo as t };

```

## index.mjs

```mjs
export { t as foo, n as utilsFoo } from "./foo.mjs";

```

## run.mjs

```mjs
import { n as foo$1, t as foo } from "./foo.mjs";
// run.ts
foo("hello world");
foo$1("hello world");
export {};

```
