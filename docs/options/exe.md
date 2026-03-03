# Executable

:::warning Experimental
The `exe` option is experimental and may change in future releases.
:::

tsdown can bundle your TypeScript/JavaScript code into a standalone executable using [Node.js Single Executable Applications](https://nodejs.org/api/single-executable-applications.html). The output is a native binary that runs without requiring Node.js to be installed.

## Requirements

- Node.js >= 25.5.0 (ESM support requires >= 25.7.0)
- Not supported in Bun or Deno

## Basic Usage

```bash
tsdown src/cli.ts --exe
```

Or in your config file:

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: true,
})
```

When `exe` is enabled:

- The default output format changes from `esm` to `cjs` (unless Node.js >= 25.7.0, which supports ESM)
- Declaration file generation (`dts`) is disabled by default
- Code splitting is disabled
- Only single entry points are supported

## Advanced Configuration

You can pass an object to `exe` for more control:

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: {
    fileName: 'my-tool',
    seaConfig: {
      disableExperimentalSEAWarning: true,
      useCodeCache: true,
    },
  },
})
```

### `fileName`

Custom output file name for the executable. Do not include `.exe`, platform suffixes, or architecture suffixes — they are added automatically.

Can be a string or a function:

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  // string
  exe: { fileName: 'my-tool' },
  // or function
  // exe: { fileName: (chunk) => `my-tool-${chunk.name}` },
})
```

### `seaConfig`

Passes options directly to Node.js. See the [Node.js documentation](https://nodejs.org/api/single-executable-applications.html) for full details.

| Option                          | Type                       | Default | Description                          |
| ------------------------------- | -------------------------- | ------- | ------------------------------------ |
| `disableExperimentalSEAWarning` | `boolean`                  | `true`  | Disable the experimental warning     |
| `useSnapshot`                   | `boolean`                  | `false` | Use V8 snapshot for faster startup   |
| `useCodeCache`                  | `boolean`                  | `false` | Use V8 code cache for faster startup |
| `execArgv`                      | `string[]`                 | —       | Extra Node.js CLI arguments          |
| `execArgvExtension`             | `'none' \| 'env' \| 'cli'` | `'env'` | How to extend execArgv at runtime    |
| `assets`                        | `Record<string, string>`   | —       | Assets to embed into the executable  |

## Cross-Platform Builds

By default, `exe` builds for the current platform. To build executables for multiple platforms from a single machine, install the `@tsdown/exe` package and use the `targets` option:

::: code-group

```bash [pnpm]
pnpm add -D @tsdown/exe
```

```bash [npm]
npm install -D @tsdown/exe
```

```bash [yarn]
yarn add -D @tsdown/exe
```

:::

```ts [tsdown.config.ts]
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: {
    targets: [
      { platform: 'linux', arch: 'x64', nodeVersion: '25.7.0' },
      { platform: 'darwin', arch: 'arm64', nodeVersion: '25.7.0' },
      { platform: 'win', arch: 'x64', nodeVersion: '25.7.0' },
    ],
  },
})
```

This downloads the target platform's Node.js binary from nodejs.org, caches it locally, and uses it to build the executable. The output files are named with platform and architecture suffixes:

```
dist/
  cli-linux-x64
  cli-darwin-arm64
  cli-win-x64.exe
```

### Target Options

Each target in the `targets` array accepts:

| Field         | Type                           | Description                                              |
| ------------- | ------------------------------ | -------------------------------------------------------- |
| `platform`    | `'win' \| 'darwin' \| 'linux'` | Target operating system (aligned with nodejs.org naming) |
| `arch`        | `'x64' \| 'arm64'`             | Target CPU architecture                                  |
| `nodeVersion` | `string`                       | Node.js version to use (must be `>=25.7.0`)              |

:::warning
When `targets` is specified, the `seaConfig.executable` option is ignored — the downloaded Node.js binary is used instead.
:::

### Caching

Downloaded Node.js binaries are cached in the system cache directory:

- **macOS:** `~/Library/Caches/tsdown/node/`
- **Linux:** `~/.cache/tsdown/node/` (or `$XDG_CACHE_HOME/tsdown/node/`)
- **Windows:** `%LOCALAPPDATA%/tsdown/Caches/node/`

Subsequent builds reuse cached binaries without re-downloading.

## Platform Notes

- On **macOS**, the executable is automatically codesigned (ad-hoc) for Gatekeeper compatibility. When cross-compiling for macOS from a non-macOS host, codesigning will be skipped with a warning.
- On **Windows**, the `.exe` extension is automatically appended.
