# Log Level

Controlling the verbosity of logs during the bundling process helps you focus on what matters most. The recommended way to manage log output in `tsdown` is by using the `--log-level` option.

## Usage

To suppress all logs—including errors—set the log level to `silent`:

```bash
tsdown --log-level silent
```

To display only error messages, set the log level to `error`:

```bash
tsdown --log-level error
```

This is useful for CI/CD pipelines or scenarios where you want minimal or no console output.

## Available Log Levels

- `silent`: No logs are shown, including errors.
- `error`: Only error messages are shown.
- `warn`: Warnings and errors are logged.
- `info`: Informational messages, warnings, and errors are logged (default).

Choose the log level that best fits your workflow to control the amount of information displayed during the build process.

## Fail on Warnings

The `failOnWarn` option controls whether warnings cause the build to exit with a non-zero code.

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // Always fail on warnings
  failOnWarn: true,
  // Fail on warnings only in CI
  failOnWarn: 'ci-only',
})
```

See [CI Environment](/advanced/ci) for more about CI-aware options.

## Suppressing Warnings

Some warnings are purely informational and not actionable in your project. The `suppressWarnings` option lets you silence warnings whose message matches a given pattern.

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  suppressWarnings: [
    // Substring match
    'is experimental',
    // RegExp match
    /Circular dependency/,
  ],
  // Or a predicate function
  // suppressWarnings: (msg) => msg.includes('is experimental'),
})
```

`suppressWarnings` accepts a string (substring match), a `RegExp`, an array of either, or a `(msg: string) => boolean` predicate.

Matched warnings are dropped **before** [`failOnWarn`](#fail-on-warnings) is applied, so a suppressed warning will not fail the build even when `failOnWarn` is enabled. This is useful for opting out of non-actionable notices (such as the TypeScript 7.0 experimental API warning) while keeping `failOnWarn: true` for everything else.
