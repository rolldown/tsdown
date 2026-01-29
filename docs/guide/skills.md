# Work with AI

tsdown provides official [skills](https://github.com/anthropics/claude-code/blob/main/docs/skills.md) for AI coding agents, enabling them to understand tsdown's configuration, features, and best practices when helping you build libraries.

## Installation

Install the tsdown skill to your AI coding agent:

```bash
npx skills add rolldown/tsdown
```

The source code of the skill is [here](https://github.com/rolldown/tsdown/tree/main/skills/tsdown).

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

## What's Included

The tsdown skill provides knowledge about:

- Configuration file formats, options, and workspace support
- Entry points, output formats, and type declarations
- Dependency handling and auto-externalization
- Framework support (React, Vue, Solid, Svelte)
- Plugins, hooks, and programmatic API
- CLI commands and usage patterns
