# Ember Support

`tsdown` supports building Ember v2 addons (libraries) by integrating [`@nullvoxpopuli/ember-rolldown`](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown). This meta-plugin compiles `.gts`/`.gjs` and template-tag (`<template>`) sources into publishable output — a single `ember()` call replaces the usual stack of `@embroider/*` externals handling, `content-tag` preprocessing, and Babel wiring.

## Minimal Example

To configure `tsdown` for an Ember library, use the following setup in your `tsdown.config.ts`:

```ts [tsdown.config.ts]
import { ember } from '@nullvoxpopuli/ember-rolldown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  plugins: [ember()],
})
```

Create a typical Ember component:

```gts [src/components/badge.gts]
import type { TOC } from '@ember/component/template-only'

export interface BadgeSignature {
  Args: { label: string }
}

export const Badge: TOC<BadgeSignature> = <template>
  <span class="badge">{{@label}}</span>
</template>
```

And export it from your entry file:

```ts [src/index.ts]
export { Badge } from './components/badge.gts'
```

This builds your entries to `dist/*.js` and `dist/*.d.ts` with sourcemaps, leaving Ember's virtual packages (e.g. `@ember/component`, `@glimmer/tracking`) and your `dependencies` / `peerDependencies` external for the consuming app to resolve.

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
> `@nullvoxpopuli/ember-rolldown` requires Node.js 24+ and TypeScript 6.

## Declarations

`.gts`/`.gjs` (template-tag) modules exist only inside the bundler's module graph, so declarations are emitted with [isolated declarations](../options/dts.md#with-isolateddeclarations) — the tsconfig your build uses must enable it (`ember()` errors otherwise):

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "isolatedDeclarations": true,
  },
}
```

This means every exported value carries an explicit type annotation, like the `TOC<BadgeSignature>` annotation above. If your package also contains dev-only code that shouldn't be constrained this way (a demo app, in-package tests), point tsdown's `tsconfig` option at a publish-only config:

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['./src/index.ts'],
  tsconfig: './tsconfig.publish.json',
  plugins: [ember()],
})
```

## How It Works

`ember()` returns a set of Rolldown plugins that:

- Keep your `dependencies`, `peerDependencies`, and the Ember virtual packages external, so the consuming app resolves them.
- Preprocess `<template>` tags via [`content-tag`](https://github.com/embroider-build/content-tag) and map `.gts`/`.gjs` modules so Rolldown understands them.
- Run Babel only on the files that actually need it (template tags, decorators); everything else stays on Rolldown's fast native transforms.
- Verify the tsconfig enables `isolatedDeclarations`.

A Babel config is optional: without one, templates, decorators, and TypeScript are handled by built-in defaults; with one, your config runs instead.

## CSS

Components that import co-located CSS (`import './badge.css'`) require [`@tsdown/css`](../options/css.md); tsdown auto-detects it and bundles imported stylesheets into a single CSS file in `dist/`. Set `css: { inject: true }` to keep the CSS import statement in the output, so consuming apps load the styles through the module graph.

For advanced topics — app re-exports for classic (name-based) resolution, `ember-scoped-css` integration, and publish-specific Babel configs — see the [plugin documentation](https://github.com/NullVoxPopuli/ember.nvp/tree/main/packages/rolldown#readme).
