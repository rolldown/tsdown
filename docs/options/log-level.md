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

The `failOnWarn` option controls whether warnings cause the build to exit with a non-zero code. By default, this is set to `'ci-only'`, which means **warnings will cause the build to fail in CI environments** but not locally.

This default behavior ensures that CI pipelines catch potential issues while keeping local development uninterrupted.

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  // Default: fail on warnings only in CI
  failOnWarn: 'ci-only',
  // Always fail on warnings
  // failOnWarn: true,
  // Never fail on warnings
  // failOnWarn: false,
})
```

See [CI Environment](/advanced/ci) for more about CI-aware options.
