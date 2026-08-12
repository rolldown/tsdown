# tsdown-migrate

[![npm version][npmx-version-src]][npmx-href]
[![npm downloads][npmx-downloads-src]][npmx-href]

A CLI tool to migrate your project from [tsup](https://github.com/egoist/tsup) to [tsdown](https://tsdown.dev).

## Usage

```bash
npx tsdown-migrate
```

### Options

- `[...dirs]` - Directories to migrate (defaults to current directory)
- `-d, --dry-run` - Preview changes without applying them
- `-y, --yes` - Skip the migration confirmation prompt
- `--package-manager <name>` - Override package manager auto-detection
- `--no-install` - Skip dependency installation

For non-interactive environments, explicitly confirm the migration. Use
`--no-install` when the caller will install dependencies after running other
migrations:

```bash
npx tsdown-migrate --yes --no-install
```

When installation is enabled, `tsdown-migrate` detects the package manager from
the project's `packageManager` field or lockfile. If detection fails in a
non-interactive environment, pass `--package-manager <name>` or `--no-install`.

### What It Does

- Renames `tsup` to `tsdown` in dependencies and scripts
- Transforms tsup config files to tsdown config format
- Handles property renames, option transformations, and import path updates
- Warns about unsupported options that need manual attention
- Runs package manager install after successful migration unless `--no-install`

## Documentation

See the [Migration Guide](https://tsdown.dev/guide/migrate-from-tsup) for more details.

## License

[MIT](../../LICENSE)

<!-- Badges -->

[npmx-version-src]: https://npmx.dev/api/registry/badge/version/tsdown-migrate
[npmx-downloads-src]: https://npmx.dev/api/registry/badge/downloads-month/tsdown-migrate
[npmx-href]: https://npmx.dev/tsdown-migrate
