# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tsdown** is a blazing-fast bundler for TypeScript libraries powered by Rolldown and Oxc. It's designed as a seamless migration path from tsup with enhanced performance and features.

**Key technologies:**

- **Rolldown**: Core bundler (Rust-based Rollup alternative)
- **pnpm**: Package manager (v10.28.1)
- **Vitest**: Testing framework
- **TypeScript**: Strict mode with isolated declarations enabled
- **ESM**: Pure ESM package (`"type": "module"`)

## Development Commands

### Building

```bash
# Build tsdown using itself
pnpm build

# Development mode (runs tsdown directly via tsx)
pnpm dev
```

### Testing

```bash
# Run all tests in watch mode
pnpm test

# Run tests without watch
pnpm test run

# Run a specific test file
pnpm test <file-pattern>
# Example: pnpm test src/config/file.test.ts

# Run with UI
pnpm test --ui

# Generate coverage
pnpm test --coverage
```

### Code Quality

```bash
# Lint (ESLint with cache)
pnpm lint

# Fix lint issues
pnpm lint:fix

# Type check
pnpm typecheck

# Format code (Prettier)
pnpm format
```

### Documentation

```bash
# Run docs dev server
pnpm docs:dev

# Build docs
pnpm docs:build

# Preview built docs
pnpm docs:preview
```

## Architecture

### Core Build Flow

```
CLI (src/cli.ts)
  → build() (src/build.ts)
  → resolveConfig() (src/config/index.ts)
  → buildWithConfigs()
  → buildSingle() for each config
    → Hook: build:prepare
    → cleanOutDir()
    → getBuildOptions() → constructs Rolldown config
    → Hook: build:before
    → rolldownBuild() / rolldownWatch()
    → postBuild() → copy files, bundle processing
    → Hook: build:done
    → executeOnSuccess()
```

### Configuration System

**Multi-stage resolution pipeline:**

1. **Load config file** (`src/config/file.ts`)
   - Searches for `tsdown.config.{ts,js,json}` or `package.json` (tsdown field)
   - Supports multiple loaders: `native` (Node.js native TS), `unrun` (transpiler), `auto` (intelligent selection)
   - Can load from Vite/Vitest configs via `fromVite` option

2. **Resolve workspace** (`src/config/workspace.ts`)
   - Auto-detects monorepo packages via `package.json` files
   - Supports glob patterns for workspace filtering
   - Root config inherited by workspace packages

3. **Resolve user config** (`src/config/options.ts`)
   - Merges CLI overrides with user config
   - Resolves entry points (supports globs and negation)
   - Normalizes format arrays and package-based settings

**Config multiplier:** Final configs = (inline) × (root configs) × (workspace packages) × (sub-configs per package)

### Hook System

Three-phase lifecycle using `hookable` library (`src/features/hooks.ts`):

1. **`build:prepare`** - Before any build starts
   - Context: `{ options: ResolvedConfig, hooks: Hookable }`

2. **`build:before`** - Before Rolldown builds (per format)
   - Extended context: `{ buildOptions: BuildOptions }`

3. **`build:done`** - After build completes
   - Extended context: `{ chunks: RolldownChunk[] }`

### Feature Modules (`src/features/`)

Each feature is self-contained and modular:

**Rolldown Plugins:**

- `dep.ts` - Dependency management, external/inline validation
- `node-protocol.ts` - Handles `node:` protocol additions/stripping
- `shebang.ts` - Preserves shebang lines in output
- `report.ts` - Bundle size reporting
- `watch.ts` - Watch mode change tracking

**Transformations:**

- `entry.ts` - Entry point resolution with glob support (including negation `!pattern`)
- `target.ts` - Compilation targets from package.json or config
- `tsconfig.ts` - TypeScript configuration resolution
- `cjs.ts` - CommonJS deprecation warnings

**Output Processing:**

- `output.ts` - Chunk filename and extension resolution
- `copy.ts` - Copy static files to dist
- `clean.ts` - Output directory cleanup

**Advanced Features:**

- `css/` - CSS handling with Lightning CSS integration
- `pkg/exports.ts` - Auto-generate package.json exports field
- `pkg/publint.ts` - Package linting
- `pkg/attw.ts` - "Are the types wrong" integration
- `devtools.ts` - Vite DevTools integration
- `shims.ts` - ESM/CJS shim injection
- `shortcuts.ts` - Watch mode keyboard shortcuts

### Plugin Architecture

Plugins follow Rolldown's interface. Internal plugins are added based on config, user plugins append last. The build supports dual-format output (ESM + CJS) with a second pass for CJS type declarations (`cjsDts`).

Public plugin exports in `src/plugins.ts`: `DepPlugin`, `NodeProtocolPlugin`, `ReportPlugin`, `ShebangPlugin`, `WatchPlugin`

### Key Architectural Patterns

1. **Multi-format builds:** Single config produces ESM + CJS + types. ES format handles types via dts plugin; CJS format has separate dts pass with `emitDtsOnly: true`

2. **Package-aware building:** Detects package.json, auto-generates exports field, validates bundled dependencies, runs package linters

3. **Lazy feature loading:** Optional peer dependencies loaded on-demand (unplugin-unused, unplugin-lightningcss, etc.)

4. **Watch mode coordination:** Config file changes trigger full rebuild restart; file changes tracked per bundle; keyboard shortcuts for manual rebuild/exit

5. **Workspace monorepo support:** Root config inherited by workspace packages; each package gets own resolved config

## Testing Patterns

### Test Setup

**Global setup:** `tests/setup.ts`

- Auto-cleanup of temp directories before each test
- Mocks `console.warn` to track warnings
- Custom matcher: `expect(message).toHaveBeenWarned()`
- Throws error for unexpected warnings after each test

**Test utilities:** `tests/utils.ts`

- `testBuild()` - Main helper for testing builds
  - Writes fixtures to temp directory
  - Runs build with provided config
  - Captures warnings and output
  - Generates snapshot comparison
- `writeFixtures()` - Write test files or load from `tests/fixtures/`
- `getTestDir()` - Get temp directory for test
- `chdir()` - Temporarily change working directory

### Test Structure

Test files are co-located with source files:

```
src/config/file.ts
src/config/file.test.ts
```

Example test pattern:

```typescript
import { describe, expect, it } from 'vitest'
import { testBuild } from '../tests/utils.ts'

describe('feature name', () => {
  it('should do something', async (context) => {
    const { snapshot, warnings } = await testBuild({
      context,
      files: {
        'index.ts': 'export const foo = "bar"',
      },
      options: {
        format: 'esm',
        dts: true,
      },
    })
    expect(snapshot).toMatchFileSnapshot()
    expect(warnings).toHaveLength(0)
  })
})
```

**Snapshot testing:** Uses `expectFilesSnapshot` from `@sxzz/test-utils` to compare output files against snapshots in `tests/__snapshots__/`

### Test Configuration

- `vitest.config.ts` sets 20s timeout, ignores `temp/` directories
- Setup file runs before each test
- Coverage includes `src/**` only
- Inline deps: `tinyglobby`, `fdir` (for fs mocking)

## Important Patterns

### Entry Point Resolution

Entry points support:

- Single file: `'index.ts'`
- Array: `['index.ts', 'cli.ts']`
- Globs: `'src/*.ts'`
- Negation: `['src/*.ts', '!src/*.test.ts']`

### Config Loaders

- `native` - Use Node.js native TypeScript support (Node 23+, Bun, Deno)
- `unrun` - Use TypeScript transpiler (compatible with all Node versions)
- `auto` - Automatically choose based on environment (default)

### Dual-Format Builds

When `format: ['esm', 'cjs']`:

1. First pass builds both formats with shared types from ESM build
2. If CJS needs separate types, second pass runs with `emitDtsOnly: true`

### Package.json Integration

tsdown detects `package.json` in the working directory to:

- Infer `type` (ESM vs CJS)
- Auto-generate `exports` field when `exports: true`
- Validate external dependencies
- Run package validators (publint, attw)

## Special Considerations

### TypeScript Configuration

- **Strict mode enabled** with `isolatedDeclarations: true`
- All exports must have explicit types
- `verbatimModuleSyntax: true` enforces explicit import types

### File System Utilities

Use utilities from `src/utils/fs.ts` instead of Node.js fs directly:

- `fsExists()`, `fsStat()` - Safe stat/exists checks
- `fsRemove()` - Recursive remove
- Path utilities respect platform differences

### Logging

Use `src/utils/logger.ts` for all logging:

- `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`
- Respects `logLevel` config option
- Structured logging with colors via `ansis`

### Watch Mode

Watch mode has special behaviors:

- Config file changes trigger full restart (clears module cache)
- Keyboard shortcuts: `r` (manual rebuild), `q` (quit)
- Build errors don't stop watch mode
- Resources cleaned via `AsyncDisposable` pattern
