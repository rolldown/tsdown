# Ember Support

`tsdown` can build Ember v2 addons (libraries) with [`@nullvoxpopuli/ember-rolldown`](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown). This meta-plugin compiles `.gts` and `.gjs` files, including their `<template>` tags, into publishable output. A single `ember()` call replaces the usual `@embroider/*` externalization setup, `content-tag` preprocessing, and Babel integration.

> [!NOTE]
> The plugin currently targets Ember libraries (v2 addons); building Ember apps has not been tested.

## Minimal Example

Configure an Ember library in `tsdown.config.ts` as follows:

```ts [tsdown.config.ts]
import { ember } from '@nullvoxpopuli/ember-rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  dts: true,
  plugins: [ember()],
})
```

Create a typical Ember component:

```gts [src/components/badge.gts]
import type { TOC } from '@ember/component/template-only'

export interface BadgeSignature {
  Element: HTMLSpanElement
  Args: { label: string }
  Blocks: { default: [] }
}

export const Badge: TOC<BadgeSignature> = <template>
  <span class="badge" ...attributes>
    {{@label}}
    {{yield}}
  </span>
</template>
```

And export it from your entry file:

```ts [src/index.ts]
export { Badge } from './components/badge.gts'
```

The build writes `.js` and `.d.ts` files for each entry to `dist/` and emits source maps for the JavaScript output. Ember virtual packages (such as `@ember/component` and `@glimmer/tracking`) and packages listed in `dependencies` or `peerDependencies` remain external and are resolved by the consuming app.

Install the required dependency:

::: code-group

```sh [npm]
npm install -D @nullvoxpopuli/ember-rolldown
```

```sh [pnpm]
pnpm add -D @nullvoxpopuli/ember-rolldown
```

```sh [yarn]
yarn add -D @nullvoxpopuli/ember-rolldown
```

```sh [bun]
bun add -D @nullvoxpopuli/ember-rolldown
```

:::

> [!NOTE]
> `@nullvoxpopuli/ember-rolldown` requires Node.js 24+. Because the package ships TypeScript source, type-checking a project that uses it also requires TypeScript 6+ and a `lib` setting that includes `es2025` (for example, `esnext`).

## Declarations

`.gts` and `.gjs` template-tag modules exist only in the bundler's module graph, so their declarations must be generated with [isolated declarations](../options/dts.md#with-isolateddeclarations). The `tsconfig` used for the build must enable `isolatedDeclarations`; otherwise, `ember()` reports an error:

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true,
  },
}
```

`isolatedDeclarations` requires sufficient type annotations on exports so declarations can be generated without cross-file type inference. For example, the component above uses the explicit `TOC<BadgeSignature>` type annotation. If your package also contains development-only code that should not be subject to this constraint, such as a demo app or in-package tests, point the `tsdown` `tsconfig` option to a publish-only config:

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['./src/index.ts'],
  tsconfig: './tsconfig.publish.json',
  plugins: [ember()],
})
```

## How It Works

`ember()` returns a set of Rolldown plugins that:

- Keep packages from `dependencies` and `peerDependencies`, along with Ember virtual packages, external for the consuming app to resolve.
- Preprocess `<template>` tags with [`content-tag`](https://github.com/embroider-build/content-tag) and map `.gts`/`.gjs` to `.ts`/`.js` so Rolldown can process them.
- Run Babel only on files that need it, such as files with template tags or decorators. All other files use Rolldown's fast native transforms.
- Verify that the `tsconfig` enables `isolatedDeclarations`.

A Babel configuration is optional. Without one, `ember()` uses built-in defaults to handle templates, decorators, and TypeScript. If you provide one, `ember()` uses it instead.

## CSS

If a component imports co-located CSS (`import './badge.css'`), install [`@tsdown/css`](../options/css.md) in your project. `tsdown` detects the package automatically and bundles imported stylesheets into a single CSS file in `dist/`. Set `css: { inject: true }` to preserve an import for that generated CSS file in the JavaScript output, allowing consuming apps to load the styles through the module graph.

For advanced topics such as app re-exports for classic name-based resolution, `ember-scoped-css` integration, and publish-specific Babel configurations, see the [plugin documentation](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown#readme).
