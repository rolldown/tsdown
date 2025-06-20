<!-- prettier-ignore-start -->
# Interface: Options

Defined in: [types.ts:69](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L69)

Options for tsdown.

## Properties

### alias?

> `optional` **alias**: `Record`\<`string`, `string`\>

Defined in: [types.ts:82](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L82)

***

### attw?

> `optional` **attw**: `boolean` \| `AttwOptions`

Defined in: [types.ts:261](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L261)

Run `arethetypeswrong` after bundling.
Requires `@arethetypeswrong/core` to be installed.

#### Default

```ts
false
```

#### See

https://github.com/arethetypeswrong/arethetypeswrong.github.io

***

### ~~bundle?~~

> `optional` **bundle**: `boolean`

Defined in: [types.ts:155](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L155)

#### Deprecated

Use `unbundle` instead.

#### Default

```ts
true
```

***

### clean?

> `optional` **clean**: `boolean` \| `string`[]

Defined in: [types.ts:117](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L117)

Clean directories before build.

Default to output directory.

#### Default

```ts
true
```

***

### config?

> `optional` **config**: `string` \| `boolean`

Defined in: [types.ts:206](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L206)

Config file path

***

### copy?

> `optional` **copy**: `CopyOptions` \| `CopyOptionsFn`

Defined in: [types.ts:304](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L304)

Copy files to another directory.

#### Example

```ts
[
  'src/assets',
  { from: 'src/assets', to: 'dist/assets' },
]
```

***

### cwd?

> `optional` **cwd**: `string`

Defined in: [types.ts:332](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L332)

The working directory of the config file.
- Defaults to `process.cwd()` for root config.
- Defaults to the package directory for workspace config.

***

### define?

> `optional` **define**: `Record`\<`string`, `string`\>

Defined in: [types.ts:157](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L157)

***

### dts?

> `optional` **dts**: `boolean` \| `Options`

Defined in: [types.ts:238](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L238)

Emit TypeScript declaration files (.d.ts).

By default, this feature is auto-detected based on the presence of the `types` field in the `package.json` file.
- If the `types` field is present in `package.json`, declaration file emission is enabled.
- If the `types` field is absent, declaration file emission is disabled by default.

***

### entry?

> `optional` **entry**: `InputOption`

Defined in: [types.ts:74](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L74)

Defaults to `'src/index.ts'` if it exists.

***

### env?

> `optional` **env**: `Record`\<`string`, `any`\>

Defined in: [types.ts:287](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L287)

Compile-time env variables.

#### Example

```json
{
  "DEBUG": true,
  "NODE_ENV": "production"
}
```

***

### exports?

> `optional` **exports**: `boolean` \| `ExportsOptions`

Defined in: [types.ts:275](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L275)

**[experimental]** Generate package exports for `package.json`.

This will set the `main`, `module`, `types`, `exports` fields in `package.json`
to point to the generated files.

***

### external?

> `optional` **external**: `ExternalOption`

Defined in: [types.ts:75](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L75)

***

### filter?

> `optional` **filter**: `string` \| `RegExp` \| `string`[]

Defined in: [types.ts:342](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L342)

Filter workspace packages. This option is only available in workspace mode.

***

### fixedExtension?

> `optional` **fixedExtension**: `boolean`

Defined in: [types.ts:173](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L173)

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

Defined in: [types.ts:105](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L105)

#### Default

```ts
['es']
```

***

### fromVite?

> `optional` **fromVite**: `boolean` \| `"vitest"`

Defined in: [types.ts:228](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L228)

Reuse config from Vite or Vitest (experimental)

#### Default

```ts
false
```

***

### globalName?

> `optional` **globalName**: `string`

Defined in: [types.ts:106](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L106)

***

### hash?

> `optional` **hash**: `boolean`

Defined in: [types.ts:325](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L325)

If enabled, appends hash to chunk filenames.

#### Default

```ts
true
```

***

### hooks?

> `optional` **hooks**: `Partial`\<`TsdownHooks`\> \| (`hooks`) => `Awaitable`\<`void`\>

Defined in: [types.ts:306](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L306)

***

### ignoreWatch?

> `optional` **ignoreWatch**: `string` \| `string`[]

Defined in: [types.ts:209](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L209)

***

### inputOptions?

> `optional` **inputOptions**: `InputOptions` \| (`options`, `format`) => `Awaitable`\<`null` \| `void` \| `InputOptions`\>

Defined in: [types.ts:96](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L96)

***

### loader?

> `optional` **loader**: [`ModuleTypes`](./type-aliases/ModuleTypes.md)

Defined in: [types.ts:199](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L199)

Sets how input files are processed.
For example, use 'js' to treat files as JavaScript or 'base64' for images.
Lets you import or require files like images or fonts.

#### Example

```json
{ '.jpg': 'asset', '.png': 'base64' }
```

***

### minify?

> `optional` **minify**: `boolean` \| `"dce-only"` \| `BindingMinifyOptions`

Defined in: [types.ts:119](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L119)

#### Default

```ts
false
```

***

### name?

> `optional` **name**: `string`

Defined in: [types.ts:165](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L165)

The name to show in CLI output. This is useful for monorepos or workspaces.
Defaults to the package name from `package.json`.

***

### noExternal?

> `optional` **noExternal**: `Arrayable`\<`string` \| `RegExp`\> \| (`id`, `importer`) => `undefined` \| `null` \| `boolean` \| `void`

Defined in: [types.ts:76](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L76)

***

### onSuccess?

> `optional` **onSuccess**: `string` \| (`config`, `signal`) => `void` \| `Promise`\<`void`\>

Defined in: [types.ts:214](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L214)

You can specify command to be executed after a successful build, specially useful for Watch mode

***

### outDir?

> `optional` **outDir**: `string`

Defined in: [types.ts:108](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L108)

#### Default

```ts
'dist'
```

***

### outExtensions?

> `optional` **outExtensions**: `OutExtensionFactory`

Defined in: [types.ts:178](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L178)

Custom extensions for output files.
`fixedExtension` will be overridden by this option.

***

### outputOptions?

> `optional` **outputOptions**: `OutputOptions` \| (`options`, `format`) => `Awaitable`\<`null` \| `void` \| `OutputOptions`\>

Defined in: [types.ts:180](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L180)

***

### platform?

> `optional` **platform**: `"node"` \| `"neutral"` \| `"browser"`

Defined in: [types.ts:95](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L95)

Specifies the target runtime platform for the build.

- `node`: Node.js and compatible runtimes (e.g., Deno, Bun).
  For CJS format, this is always set to `node` and cannot be changed.
- `neutral`: A platform-agnostic target with no specific runtime assumptions.
- `browser`: Web browsers.

#### Default

```ts
'node'
```

#### See

https://tsdown.dev/options/platform

***

### plugins?

> `optional` **plugins**: `RolldownPluginOption`\<`any`\>

Defined in: [types.ts:189](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L189)

***

### ~~publicDir?~~

> `optional` **publicDir**: `CopyOptions` \| `CopyOptionsFn`

Defined in: [types.ts:292](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L292)

#### Deprecated

Alias for `copy`, will be removed in the future.

***

### publint?

> `optional` **publint**: `boolean` \| `Options`

Defined in: [types.ts:252](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L252)

Run publint after bundling.
Requires `publint` to be installed.

#### Default

```ts
false
```

***

### nodeProtocol?

> `optional` **nodeProtocol**: `'strip'` \| `boolean`

Defined in: [types.ts:336](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L336)

- If true, add `node:` prefix to built-in modules.
- If 'strip', strips the `node:` protocol prefix from import source.
- If false, does not modify the import source.

#### Default

```ts
false
```

#### Example

<!-- eslint-skip -->

```ts
// With nodeProtocol enabled:
import('fs'); // becomes import('node:fs')
// With nodeProtocol set to 'strip':
import('node:fs'); // becomes import('fs')
// With nodeProtocol set to false:
import('node:fs'); // remains import('node:fs')
```

***

### removeNodeProtocol?

> `optional` **removeNodeProtocol**: `boolean`

Defined in: [types.ts:319](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L319)

If enabled, strips the `node:` protocol prefix from import source.

#### Default

```ts
false
```

#### Example

```ts
// With removeNodeProtocol enabled:
import('node:fs'); // becomes import('fs')
```

#### Deprecated

Use `nodeProtocol: 'strip'` instead.

***

### report?

> `optional` **report**: `boolean` \| `ReportOptions`

Defined in: [types.ts:267](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L267)

Enable size reporting after bundling.

#### Default

```ts
true
```

***

### shims?

> `optional` **shims**: `boolean`

Defined in: [types.ts:159](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L159)

#### Default

```ts
false
```

***

### silent?

> `optional` **silent**: `boolean`

Defined in: [types.ts:202](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L202)

#### Default

```ts
false
```

***

### skipNodeModulesBundle?

> `optional` **skipNodeModulesBundle**: `boolean`

Defined in: [types.ts:222](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L222)

Skip bundling `node_modules`.

#### Default

```ts
false
```

***

### sourcemap?

> `optional` **sourcemap**: [`Sourcemap`](./type-aliases/Sourcemap.md)

Defined in: [types.ts:110](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L110)

#### Default

```ts
false
```

***

### target?

> `optional` **target**: `string` \| `false` \| `string`[]

Defined in: [types.ts:142](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L142)

Specifies the compilation target environment(s).

Determines the JavaScript version or runtime(s) for which the code should be compiled.
If not set, defaults to the value of `engines.node` in your project's `package.json`.

Accepts a single target (e.g., `'es2020'`, `'node18'`) or an array of targets.

#### See

[https://tsdown.dev/options/target#supported-targets](https://tsdown.dev/options/target#supported-targets) for a list of valid targets and more details.

#### Examples

```jsonc
// Target a single environment
{ "target": "node18" }
```

```jsonc
// Target multiple environments
{ "target": ["node18", "es2020"] }
```

***

### treeshake?

> `optional` **treeshake**: `boolean`

Defined in: [types.ts:188](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L188)

#### Default

```ts
true
```

***

### tsconfig?

> `optional` **tsconfig**: `string` \| `boolean`

Defined in: [types.ts:83](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L83)

***

### unbundle?

> `optional` **unbundle**: `boolean`

Defined in: [types.ts:149](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L149)

Determines whether unbundle mode is enabled.
When set to true, the output files will mirror the input file structure.

#### Default

```ts
false
```

***

### unused?

> `optional` **unused**: `boolean` \| `Options`

Defined in: [types.ts:245](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L245)

Enable unused dependencies check with `unplugin-unused`
Requires `unplugin-unused` to be installed.

#### Default

```ts
false
```

***

### watch?

> `optional` **watch**: `string` \| `boolean` \| `string`[]

Defined in: [types.ts:208](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L208)

#### Default

```ts
false
```

***

### workspace?

> `optional` **workspace**: `true` \| [`Workspace`](workspace.md) \| `Arrayable`\<`string`\>

Defined in: [types.ts:338](https://github.com/rolldown/tsdown/blob/0978c68bd505c76d7e3097572cd652f81c23f97e/src/options/types.ts#L338)

**[experimental]** Enable workspace mode.
This allows you to build multiple packages in a monorepo.

<!-- prettier-ignore-end -->
