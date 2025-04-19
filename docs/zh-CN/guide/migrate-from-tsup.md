# Migrate from tsup

[tsup](https://tsup.egoist.dev/) is a powerful and widely-used bundler that shares many similarities with `tsdown`. While `tsup` is built on top of [esbuild](https://esbuild.github.io/), `tsdown` leverages the power of [Rolldown](https://rolldown.rs/) to deliver a **faster** and more **powerful** bundling experience.

If you're currently using `tsup` and want to migrate to `tsdown`, the process is straightforward thanks to the dedicated `migrate` command:

```bash
npx tsdown migrate
```

> [!WARNING]
> Please save your changes before migration. The migration process may modify your configuration files, so it's important to ensure all your changes are committed or backed up beforehand.

### Migration Options

The `migrate` command supports the following options to customize the migration process:

- `--cwd <dir>` (or `-c`): Specify the working directory for the migration.
- `--dry-run` (or `-d`): Perform a dry run to preview the migration without making any changes.

With these options, you can easily tailor the migration process to fit your specific project setup.

## Acknowledgements

`tsdown` would not have been possible without the inspiration and contributions of the open-source community. We would like to express our heartfelt gratitude to the following:

- **[tsup](https://tsup.egoist.dev/)**: `tsdown` was heavily inspired by `tsup`, and even incorporates parts of its codebase. The simplicity and efficiency of `tsup` served as a guiding light during the development of `tsdown`.
- **[@egoist](https://github.com/egoist)**: The creator of `tsup`, whose work has significantly influenced the JavaScript and TypeScript tooling ecosystem. Thank you for your dedication and contributions to the community.
