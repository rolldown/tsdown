# Solid Support

`tsdown` streamlines the development of Solid component libraries by integrating with [`unplugin-solid`](https://github.com/unplugin/unplugin-solid). This integration allows you to bundle Solid components and automatically generate type declarations using modern TypeScript tools.

## Quick Start

For the fastest way to get started, use the Solid component starter template. This starter project comes pre-configured for Solid library development, so you can focus on building components right away.

```bash
npx create-tsdown@latest -t solid
```

## Minimal Example

To configure `tsdown` for a Solid library, use the following setup in your `tsdown.config.ts`:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'
import solid from 'unplugin-solid/rolldown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
  plugins: [solid()],
})
```

Create your typical Solid component:

```tsx [MyButton.tsx]
import type { Component } from 'solid-js'

interface MyButtonProps {
  type?: 'primary'
}

export const MyButton: Component<MyButtonProps> = ({ type }) => {
  return (
    <button class="my-button">
      my button: type
      {type}
    </button>
  )
}
```

And export it in your entry file:

```ts [index.ts]
export { MyButton } from './MyButton'
```

Install the required dependencies:

::: code-group

```sh [npm]
npm install -D unplugin-solid
```

```sh [pnpm]
pnpm add -D unplugin-solid
```

```sh [yarn]
yarn add -D unplugin-solid
```

```sh [bun]
bun add -D unplugin-solid
```

:::
