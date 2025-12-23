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

:::info

Generating `.d.ts` for Svelte components typically requires integrating [`svelte2tsx`](https://www.npmjs.com/package/svelte2tsx). We recommend using the dedicated Svelte template, which includes an emission step based on `svelte2tsx` to generate declarations after bundling.

:::

## Distribution

In line with community practice and SvelteKit’s [Packaging](https://svelte.dev/docs/kit/packaging) guide, avoid publishing precompiled JS components. Prefer shipping `.svelte` sources and let consumers’ Svelte tooling (e.g. Vite + `@sveltejs/vite-plugin-svelte`) compile them in their apps.

Reasons not to precompile to JS:

- Version compatibility: precompiled output ties to a specific compiler and `svelte/internal` version; mismatches can cause runtime or SSR/hydration issues.
- SSR/hydration consistency: differing compile options (`generate`, `hydratable`, `dev`, etc.) between library and app can lead to hydration mismatches.
- Tooling and optimization: source form benefits from better HMR, diagnostics, CSS handling, and tree-shaking; precompiled JS may lose these advantages.
- Maintenance: fewer republish cycles when Svelte upgrades, since consumers compile with their chosen versions.

When shipping JS can make sense (exceptions):

- You provide artifacts usable outside Svelte (e.g. `customElement` Web Components).
- CDN direct-load scenarios without a consumer build step.

For detailed packaging configuration (e.g. `exports`, `types`, `files`, `sideEffects`, subpath exports and types, declaration maps), see the official guide.

::: tip
tsdown essentials:

- Mark `svelte`/`svelte/*` as external in `tsdown` and declare `svelte` in `peerDependencies`.
- Use `rollup-plugin-svelte` for preprocessing/integration and keep `.svelte` in source form for distribution.
- Use `svelte2tsx` to emit `.d.ts` aligned with your `exports` subpath exports.
  :::
