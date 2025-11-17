# React Support

`tsdown` provides first-class support for building React component libraries. As [Rolldown](https://rolldown.rs/) natively supports bundling JSX/TSX files, you don't need any additional plugins to get started.

## Quick Start

For the fastest way to get started, use the React component starter template. This starter project comes pre-configured for React library development, so you can focus on building components right away.

```bash
npx create-tsdown@latest -t react
```

If you plan to use React Compiler, you can directly scaffold the dedicated template:

```bash
npx create-tsdown@latest -t react-compiler
```

## Minimal Example

To configure `tsdown` for a React library, you can just use a standard `tsdown.config.ts`:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
})
```

Create your typical React component:

```tsx [MyButton.tsx]
import React from 'react'

interface MyButtonProps {
  type?: 'primary'
}

export const MyButton: React.FC<MyButtonProps> = ({ type }) => {
  return <button className="my-button">my button: type {type}</button>
}
```

And export it in your entry file:

```ts [index.ts]
export { MyButton } from './MyButton'
```

::: warning

There are 2 ways of transforming JSX/TSX files in `tsdown`:

- **classic**
- **automatic** (default)

If you need to use classic JSX transformation, you can configure Rolldown's [`inputOptions.jsx`](https://rolldown.rs/reference/config-options#jsx) option in your configuration file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    jsx: 'react', // Use classic JSX transformation
  },
})
```

:::

## Enable React Compiler

React Compiler is a new build-time tool that automatically optimizes your React application. React recommends library authors use React Compiler to precompile their code.

React Compiler is currently available only as a Babel plugin. If you plan to use React Compiler, you can scaffold the `react-compiler` template above, or integrate manually:

```bash
pnpm add -D @rollup/plugin-babel babel-plugin-react-compiler
```

```ts [tsdown.config.ts]
import pluginBabel from '@rollup/plugin-babel'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    pluginBabel({
      babelHelpers: 'bundled',
      parserOpts: {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      },
      plugins: ['babel-plugin-react-compiler'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    }),
  ],
})
```
