# Interface: Options

Defined in: [options.ts:38](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L38)

Options for tsdown.

## Properties

### alias?

> `optional` **alias**: `Record`\<`string`, `string`\>

Defined in: [options.ts:48](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L48)

***

### clean?

> `optional` **clean**: `boolean` \| `string`[]

Defined in: [options.ts:66](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L66)

***

### config?

> `optional` **config**: `string` \| `boolean`

Defined in: [options.ts:102](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L102)

Config file path

***

### define?

> `optional` **define**: `Record`\<`string`, `string`\>

Defined in: [options.ts:70](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L70)

***

### dts?

> `optional` **dts**: `boolean` \| `Options`

Defined in: [options.ts:125](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L125)

Emit declaration files

***

### entry?

> `optional` **entry**: `InputOption`

Defined in: [options.ts:40](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L40)

***

### external?

> `optional` **external**: `ExternalOption`

Defined in: [options.ts:41](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L41)

***

### fixedExtension?

> `optional` **fixedExtension**: `boolean`

Defined in: [options.ts:80](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L80)

Use a fixed extension for output files.
The extension will always be `.cjs` or `.mjs`.
Otherwise, it will depend on the package type.

#### Default

```ts
false
```

***

### format?

> `optional` **format**: `ModuleFormat` \| `ModuleFormat`[]

Defined in: [options.ts:61](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L61)

#### Default

```ts
'es'
```

***

### fromVite?

> `optional` **fromVite**: `boolean` \| `"vitest"`

Defined in: [options.ts:119](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L119)

Reuse config from Vite or Vitest (experimental)

#### Default

```ts
false
```

***

### globalName?

> `optional` **globalName**: `string`

Defined in: [options.ts:62](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L62)

***

### inputOptions?

> `optional` **inputOptions**: `InputOptions` \| (`options`, `format`) => `Awaitable`\<`null` \| `void` \| `InputOptions`\>

Defined in: [options.ts:52](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L52)

***

### minify?

> `optional` **minify**: `boolean`

Defined in: [options.ts:68](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L68)

#### Default

```ts
false
```

***

### noExternal?

> `optional` **noExternal**: `Arrayable`\<`string` \| `RegExp`\> \| (`id`, `importer`) => `undefined` \| `null` \| `boolean` \| `void`

Defined in: [options.ts:42](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L42)

***

### onSuccess?

> `optional` **onSuccess**: `string` \| (`config`) => `void` \| `Promise`\<`void`\>

Defined in: [options.ts:108](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L108)

You can specify command to be executed after a successful build, specially useful for Watch mode

***

### outDir?

> `optional` **outDir**: `string`

Defined in: [options.ts:64](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L64)

#### Default

```ts
'dist'
```

***

### outExtensions?

> `optional` **outExtensions**: `OutExtensionFactory`

Defined in: [options.ts:85](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L85)

Custom extensions for output files.
`fixedExtension` will be overridden by this option.

***

### outputOptions?

> `optional` **outputOptions**: `OutputOptions` \| (`options`, `format`) => `Awaitable`\<`null` \| `void` \| `OutputOptions`\>

Defined in: [options.ts:87](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L87)

***

### platform?

> `optional` **platform**: `"node"` \| `"neutral"` \| `"browser"`

Defined in: [options.ts:51](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L51)

#### Default

```ts
'node'
```

***

### plugins?

> `optional` **plugins**: `RolldownPluginOption`

Defined in: [options.ts:96](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L96)

***

### publint?

> `optional` **publint**: `boolean` \| `Options`

Defined in: [options.ts:137](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L137)

Run publint after bundling.
Requires `publint` to be installed.

***

### shims?

> `optional` **shims**: `boolean`

Defined in: [options.ts:72](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L72)

#### Default

```ts
false
```

***

### silent?

> `optional` **silent**: `boolean`

Defined in: [options.ts:98](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L98)

***

### skipNodeModulesBundle?

> `optional` **skipNodeModulesBundle**: `boolean`

Defined in: [options.ts:113](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L113)

Skip bundling node_modules.

***

### sourcemap?

> `optional` **sourcemap**: [`Sourcemap`](../type-aliases/Sourcemap.md)

Defined in: [options.ts:65](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L65)

***

### target?

> `optional` **target**: `string` \| `string`[]

Defined in: [options.ts:69](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L69)

***

### treeshake?

> `optional` **treeshake**: `boolean`

Defined in: [options.ts:95](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L95)

#### Default

```ts
true
```

***

### tsconfig?

> `optional` **tsconfig**: `string` \| `boolean`

Defined in: [options.ts:49](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L49)

***

### unused?

> `optional` **unused**: `boolean` \| `Options`

Defined in: [options.ts:131](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L131)

Enable unused dependencies check with `unplugin-unused`
Requires `unplugin-unused` to be installed.

***

### watch?

> `optional` **watch**: `string` \| `boolean` \| `string`[]

Defined in: [options.ts:103](https://github.com/Gugustinette/tsdown/blob/fa8416e3684802bd06a614b08ad3c150a38bf5d7/src/options.ts#L103)
