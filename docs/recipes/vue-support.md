# Vue Support

`tsdown` provides first-class support for building Vue component libraries by seamlessly integrating with [`unplugin-vue`](https://github.com/unplugin/unplugin-vue) and [`rolldown-plugin-dts`](https://github.com/sxzz/rolldown-plugin-dts). This setup enables you to bundle Vue components and generate type declarations with modern TypeScript tooling.

## Quick Start

For the fastest way to get started, use the Vue component starter template. This starter project comes pre-configured for Vue library development, so you can focus on building components right away.

```bash
npx create-tsdown@latest -t vue
```

## Minimal Example

To configure `tsdown` for a Vue library, use the following setup in your `tsdown.config.ts`:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'
import Vue from 'unplugin-vue/rolldown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  plugins: [Vue({ isProduction: true })],
  dts: { vue: true },
})
```

Install the required dependencies:

```bash
npm install -D unplugin-vue vue-tsc
```

## How It Works

- **`unplugin-vue`** compiles `.vue` single-file components into JavaScript and extracts CSS, making them ready for bundling.
- **`rolldown-plugin-dts`** (with `vue: true`) and **`vue-tsc`** work together to generate accurate TypeScript declaration files for your Vue components, ensuring consumers of your library get full type support.

> [!TIP]
> Set `platform: 'neutral'` to maximize compatibility for libraries that may be used in both browser and Node.js environments.
