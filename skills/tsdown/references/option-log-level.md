# Log Level

Control the verbosity of build output.

## Overview

The `logLevel` option controls how much information tsdown displays during the build process.

## Type

```ts
logLevel?: 'silent' | 'error' | 'warn' | 'info'
```

**Default:** `'info'`

## Basic Usage

### CLI

```bash
# Suppress all output
tsdown --log-level silent

# Only show errors
tsdown --log-level error

# Show warnings and errors
tsdown --log-level warn

# Show all info (default)
tsdown --log-level info
```

### Config File

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  logLevel: 'error',
})
```

## Available Levels

| Level | Shows | Use Case |
|-------|-------|----------|
| `silent` | Nothing | CI/CD pipelines, scripting |
| `error` | Errors only | Minimal output |
| `warn` | Warnings + errors | Standard CI/CD |
| `info` | All messages | Development (default) |

## Common Patterns

### CI/CD Pipeline

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  logLevel: 'error',  // Only show errors in CI
})
```

### Scripting

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  logLevel: 'silent',  // No output for automation
})
```

## Related Options

- [CLI Reference](reference-cli.md) - All CLI options
- [Config File](option-config-file.md) - Configuration setup
