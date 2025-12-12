# React Support

`tsdown` provides first-class support for building React component libraries. As [Rolldown](https://rolldown.rs/) natively supports bundling JSX/TSX files, you don't need any additional plugins to get started.

## Quick Start

For the fastest way to get started, use the React component starter template. This starter project comes pre-configured for React library development, so you can focus on building components right away.

```bash
npx create-tsdown@latest -t react
```

To use React Compiler, you can quickly set up a project with the dedicated template:

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
    transform: {
      jsx: 'react', // Use classic JSX transformation
    }
  },
})
```

:::

## Enabling React Compiler

React Compiler is an innovative build-time tool that automatically optimizes your React applications. React recommends that library authors use React Compiler to precompile their code for improved performance.

Currently, React Compiler is available only as a Babel plugin. To get started, you can either scaffold the `react-compiler` template as shown above, or integrate it manually:

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
