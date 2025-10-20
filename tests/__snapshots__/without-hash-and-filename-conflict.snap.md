## foo.js

```js
//#region utils/foo.ts
const foo$1 = (a) => {
	console.log("utils/foo:" + a);
};

//#endregion
//#region foo.ts
const foo = (a) => {
	console.log("foo:" + a);
};

//#endregion
export { foo$1 as n, foo as t };
```

## index.js

```js
import { n as foo$1, t as foo } from "./foo.js";

export { foo, foo$1 as utilsFoo };
```

## run.js

```js
import { n as foo$1, t as foo } from "./foo.js";

//#region run.ts
foo("hello world");
foo$1("hello world");

//#endregion
export {  };
```
