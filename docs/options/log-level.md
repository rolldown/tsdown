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

> [!NOTE] Deprecated Silent Mode
> The `--silent` option is **deprecated**. Please use `--log-level error` instead for future compatibility.

## Available Log Levels

- `silent`: No logs are shown, including errors.
- `error`: Only error messages are shown.
- `warn`: Warnings and errors are logged.
- `info`: Informational messages, warnings, and errors are logged (default).

Choose the log level that best fits your workflow to control the amount of information displayed during the build process.
