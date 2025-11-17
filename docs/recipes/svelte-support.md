# Svelte Support

`tsdown` supports building Svelte component libraries by integrating [`rollup-plugin-svelte`](https://github.com/sveltejs/rollup-plugin-svelte). This setup compiles `.svelte` components and bundles them alongside your TypeScript sources.

## Quick Start

For the fastest way to get started, use the Svelte component starter template. This starter project comes pre-configured for Svelte library development.

```bash
npx create-tsdown@latest -t svelte
```

## Minimal Example

Configure `tsdown` for a Svelte library with the following `tsdown.config.ts`:

```ts [tsdown.config.ts]
import svelte from 'rollup-plugin-svelte'
import { sveltePreprocess } from 'svelte-preprocess'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  plugins: [svelte({ preprocess: sveltePreprocess() })],
})
```

Install the required dependencies:

::: code-group

```sh [npm]
npm install -D rollup-plugin-svelte svelte svelte-preprocess
```

```sh [pnpm]
pnpm add -D rollup-plugin-svelte svelte svelte-preprocess
```

```sh [yarn]
yarn add -D rollup-plugin-svelte svelte svelte-preprocess
```

```sh [bun]
bun add -D rollup-plugin-svelte svelte svelte-preprocess
```

:::

## How It Works

- **`rollup-plugin-svelte`** compiles `.svelte` single-file components.
- **`tsdown`** bundles the compiled output with your TypeScript sources.

::: warning

Generating `.d.ts` for Svelte components typically requires integrating `svelte2tsx`. We recommend using the dedicated Svelte template, which includes an emission step based on `svelte2tsx` to generate declarations after bundling.

:::
