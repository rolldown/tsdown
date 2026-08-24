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

If you need to use classic JSX transformation, you can configure Rolldown's [`transform.jsx`](https://rolldown.rs/reference/InputOptions.transform#jsx) option in your configuration file:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    transform: {
      jsx: 'react', // Use classic JSX transformation
    },
  },
})
```

:::

## Enabling React Compiler

React Compiler is an innovative build-time tool that automatically memoizes React components and hooks. React recommends that library authors use React Compiler to precompile their code for improved performance.

There are two ways to use it in `tsdown`: the stable Babel-based integration, and the new experimental native Oxc support.

### Babel preset

React Compiler is distributed as a Babel plugin. `@vitejs/plugin-react` exports a `reactCompilerPreset` helper that configures `babel-plugin-react-compiler` for you. Combine it with `@rolldown/plugin-babel` to use it in `tsdown`:

```bash
pnpm add -D @rolldown/plugin-babel @vitejs/plugin-react babel-plugin-react-compiler
```

```ts [tsdown.config.ts]
import pluginBabel from '@rolldown/plugin-babel'
import { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    pluginBabel({
      presets: [reactCompilerPreset()],
    }),
  ],
})
```

### Native Oxc support (experimental)

Since [`@vitejs/plugin-react` 6.1.0](https://github.com/vitejs/vite-plugin-react/releases/tag/plugin-react%406.1.0), React Compiler is also available in a native form through the standalone [`oxc-transform-react`](https://oxc.rs/docs/guide/usage/transformer/react-compiler.html) package, which bundles the Rust port of the React Compiler. Install it and enable the experimental `compiler` option:

```bash
pnpm add -D @vitejs/plugin-react oxc-transform-react
```

```ts [tsdown.config.ts]
import react from '@vitejs/plugin-react'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  dts: true,
  plugins: [
    react({
      compiler: true,
      // Only needed when `dts: true`: prevent the plugin from
      // transforming the generated .d.ts files
      exclude: [/node_modules/, /\.d\.ts$/],
    }),
  ],
})
```

The `exclude` is only required when `dts: true` — the plugin's default filter also matches generated declaration files, which breaks the build. Without `dts`, `react({ compiler: true })` is all you need.

The compiler runs on the original source before any other transform and is enabled by default with a React 19 target. Pass compiler options to target other versions:

```ts
react({
  compiler: {
    target: '18', // '17' | '18' | '19'
  },
})
```

React 19 ships the compiler runtime in `react`; targets 17 and 18 require the `react-compiler-runtime` package. Files whose filename contains `node_modules` are skipped by default — provide a `sources` allowlist in the compiler options to opt dependencies back in.

::: warning

The native React Compiler support is experimental and under active development. Options and behaviour may change, so review the generated output before using it in production.

:::
