<img src="./docs/public/og-image.svg" alt="tsdown" width="100%" /><br>

# tsdown [![npm](https://img.shields.io/npm/v/tsdown.svg)](https://npmjs.com/package/tsdown) [![Unit Test](https://github.com/rolldown/tsdown/actions/workflows/tests.yml/badge.svg)](https://github.com/rolldown/tsdown/actions/workflows/tests.yml) [![JSR](https://jsr.io/badges/@sxzz/tsdown)](https://jsr.io/@sxzz/tsdown)

⚡️ Smooth and fast library bundler powered by Rolldown [Rolldown](https://github.com/rolldown/rolldown).

## Features

- 🚀 **Blazing fast**: Build and generate `.d.ts` powered by Oxc and Rolldown, incredibly fast!
- ♻️ **Powerful ecosystem**: Support Rollup / Rolldown / unplugin plugins, and some Vite plugins.
- 📦 **Out-of-box**: Support reusing configurations from Vite or Vitest.
- 🔄 **Seamless migration**: Compatible with tsup's main options and features, ensuring a smooth transition.

## Install

```bash
npm i tsdown
```

## Configuration

```ts
// tsdown.config.ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src'],
  // ...
})
```

## Usage

```bash
npx tsdown
```

## Migrate from tsup

```bash
npx tsdown migrate
```

Please make sure to commit your changes before migrating.

## Credits

This project also partially contains code derived or copied from [tsup](https://github.com/egoist/tsup).

- [tsup](https://github.com/egoist/tsup)
- [pkgroll](https://github.com/privatenumber/pkgroll)

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/sxzz/sponsors/sponsors.svg'/>
  </a>
</p>

## Licenses

This project is licensed under the [MIT License](LICENSE).
