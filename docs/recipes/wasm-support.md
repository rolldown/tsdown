# WASM Support

`tsdown` supports bundling WebAssembly (WASM) modules through [`rolldown-plugin-wasm`](https://github.com/sxzz/rolldown-plugin-wasm). This plugin allows you to import `.wasm` files directly in your TypeScript or JavaScript code, with support for both synchronous and asynchronous instantiation.

## Minimal Example

To configure `tsdown` for WASM support, add the plugin to your `tsdown.config.ts`:

```ts [tsdown.config.ts]
import { wasm } from 'rolldown-plugin-wasm'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  plugins: [wasm()],
})
```

Install the required dependency:

::: code-group

```sh [npm]
npm install -D rolldown-plugin-wasm
```

```sh [pnpm]
pnpm add -D rolldown-plugin-wasm
```

```sh [yarn]
yarn add -D rolldown-plugin-wasm
```

```sh [bun]
bun add -D rolldown-plugin-wasm
```

:::

## Importing WASM Modules

You can import WASM modules directly:

```ts
import { add } from './add.wasm'

add(1, 2)
```

### Asynchronous Init

Use the `?init` query to get an async initialization function:

```ts
import init from './add.wasm?init'

const instance = await init(
  imports, // optional
)

instance.exports.add(1, 2)
```

### Synchronous Init

Use the `?init&sync` query for synchronous initialization:

```ts
import initSync from './add.wasm?init&sync'

const instance = initSync(
  imports, // optional
)

instance.exports.add(1, 2)
```

## `wasm-bindgen` Support

### Target `bundler` (Default, Recommended)

```ts
import { add } from 'some-pkg'

add(1, 2)
```

### Target `web`

#### Node.js

```ts
import { readFile } from 'node:fs/promises'
import init, { add } from 'some-pkg'
import wasmUrl from 'some-pkg/add_bg.wasm?url'

await init({
  module_or_path: readFile(new URL(wasmUrl, import.meta.url)),
})

add(1, 2)
```

#### Browser

```ts
import init, { add } from 'some-pkg/add.js'
import wasmUrl from 'some-pkg/add_bg.wasm?url'

await init({
  module_or_path: wasmUrl,
})

add(1, 2)
```

> [!NOTE]
> Other `wasm-bindgen` targets such as `nodejs` and `no-modules` are not supported.

## TypeScript Support

To get type support for `.wasm` imports, add the type declarations to your `tsconfig.json`:

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "types": ["rolldown-plugin-wasm/types"],
  },
}
```

## Options

The plugin accepts an options object:

```ts
wasm({
  maxFileSize: 14 * 1024, // Max file size for inline (default: 14KB)
  fileName: '[hash][extname]', // Output file name pattern
  publicPath: '', // Prefix for non-inlined file paths
  targetEnv: 'auto', // 'auto' | 'auto-inline' | 'browser' | 'node'
})
```

| Option        | Default             | Description                                                                                                                                                                                                                                      |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxFileSize` | `14 * 1024`         | Maximum file size for inlining. Files exceeding this limit are copied to the output directory and loaded at runtime. Set to `0` to always copy.                                                                                                  |
| `fileName`    | `'[hash][extname]'` | Pattern for renaming emitted WASM files.                                                                                                                                                                                                         |
| `publicPath`  | —                   | Prefix added to file paths for non-inlined WASM files.                                                                                                                                                                                           |
| `targetEnv`   | `'auto'`            | Controls the generated instantiation code. `'auto'` detects the environment at runtime; `'auto-inline'` always inlines and decodes based on environment; `'browser'` omits Node.js builtins; `'node'` omits `fetch` (requires Node.js 20.16.0+). |
