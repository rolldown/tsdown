# Executable (SEA) - `exe`

**[experimental]** Bundle as executable using Node.js Single Executable Applications (SEA).

## Requirements

- Node.js >= 25.5.0
- Not supported in Bun or Deno

## Basic Usage

```ts
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: true,
})
```

## Behavior When Enabled

- Default output format changes from `esm` to `cjs` (unless ESM SEA is supported)
- Declaration file generation (`dts`) is disabled by default
- Code splitting is disabled
- Only single entry points are supported
- Legacy CJS warnings are suppressed

## Advanced Configuration

```ts
export default defineConfig({
  entry: ['src/cli.ts'],
  exe: {
    fileName: 'my-tool',
    seaConfig: {
      disableExperimentalSEAWarning: true,
      useCodeCache: true,
      useSnapshot: false,
    },
  },
})
```

## `ExeOptions`

| Option | Type | Description |
|--------|------|-------------|
| `seaConfig` | `Omit<SeaConfig, 'main' \| 'output'>` | Node.js SEA configuration options |
| `fileName` | `string \| ((chunk) => string)` | Custom output file name for the executable |

## `SeaConfig`

See [Node.js SEA Documentation](https://nodejs.org/api/single-executable-applications.html#generating-single-executable-applications-with---build-sea).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disableExperimentalSEAWarning` | `boolean` | `true` | Disable the experimental SEA warning |
| `useSnapshot` | `boolean` | `false` | Use V8 snapshot |
| `useCodeCache` | `boolean` | `true` | Use V8 code cache |
| `execArgv` | `string[]` | - | Extra Node.js arguments |
| `execArgvExtension` | `'none' \| 'env' \| 'cli'` | `'env'` | How to extend execArgv |
| `assets` | `Record<string, string>` | - | Assets to embed |

## Platform Notes

- On macOS, the executable is automatically codesigned (ad-hoc) for Gatekeeper compatibility
- On Windows, the `.exe` extension is automatically appended

## CLI

```bash
tsdown --exe
tsdown src/cli.ts --exe
```
