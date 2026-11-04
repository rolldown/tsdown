# Work with AI

tsdown provides official [skills](https://agentskills.io/) for AI coding agents, enabling them to understand tsdown's configuration, features, and best practices when helping you build libraries.

## Installation

Install all tsdown skills to your AI coding agent:

```bash
npx skills add rolldown/tsdown
```

Or install a specific skill only:

```bash
npx skills add rolldown/tsdown --skill tsdown          # tsdown skill only
npx skills add rolldown/tsdown --skill tsdown-migrate   # migration skill only
```

The source code of the skills is [here](https://github.com/rolldown/tsdown/tree/main/skills).

## Example Prompts

Once installed, you can ask agents to help with various tsdown tasks:

```
Set up tsdown to build my TypeScript library with ESM and CJS formats
```

```
Configure tsdown to generate type declarations and bundle for browsers
```

```
Add React support to my tsdown config with Fast Refresh
```

```
Set up a monorepo build with tsdown workspace support
```

## Migration Skill

For projects migrating from tsup, a dedicated migration skill is also included when you install `rolldown/tsdown`. You can also install it separately:

```bash
npx skills add rolldown/tsdown --skill tsdown-migrate
```

This skill teaches AI agents how to perform tsup→tsdown migrations by providing:

- Complete option mappings between tsup and tsdown
- Default value differences and how to preserve tsup behavior
- Unsupported options and their alternatives
- Package.json migration rules (dependencies, scripts, config fields)
- New tsdown-exclusive features to suggest after migration

### Example Prompts

```
Migrate my tsup project to tsdown
```

```
Convert my tsup.config.ts to tsdown format
```

```
What are the differences between tsup and tsdown options?
```

The source code of the migration skill is [here](https://github.com/rolldown/tsdown/tree/main/skills/tsdown-migrate).

## What's Included

The tsdown skill provides knowledge about:

- Configuration file formats, options, and workspace support
- Entry points, output formats, and type declarations
- Dependency handling and auto-externalization
- Framework support (React, Vue, Solid, Svelte)
- Plugins, hooks, and programmatic API
- CLI commands and usage patterns
