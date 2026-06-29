## index.mjs

```mjs
//#endregion
//#region index.ts
console.log(".foo {\n  color: red;\n}\n");
//#endregion
export {};

//# sourceMappingURL=index.mjs.map
```

## index.mjs.map

```map
{"version":3,"file":"index.mjs","names":["css"],"sources":["../foo.css?inline","../index.ts"],"sourcesContent":[".foo { color: red }","import css from './foo.css?inline'\nconsole.log(css)"],"mappings":";;ACCA,QAAQ,IAAIA,4BAAG"}
```
