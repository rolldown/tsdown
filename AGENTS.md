# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

**tsdown** is a blazing-fast bundler for TypeScript libraries powered by Rolldown and Oxc. It's designed as a seamless migration path from tsup with enhanced performance and features.

**Key technologies:**

- **Rolldown**: Core bundler (Rust-based Rollup alternative)
- **pnpm**: Package manager (v11)
- **Node.js**: `^22.18.0 || ^24.11.0 || >=26.0.0` (see `engines` in package.json)
- **Vitest**: Testing framework
- **TypeScript**: Strict mode with isolated declarations enabled
- **ESM**: Pure ESM package (`"type": "module"`)

## Development Commands

### Building

```bash
# Build tsdown using itself (runs from source via Node's `dev` condition)
pnpm build

# Alias of `pnpm build`
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
# Example: pnpm test src/config/options.test.ts

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
CLI (src/run.ts → src/cli.ts)
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
   - Searches for `tsdown.config.{ts,mts,cts,js,mjs,cjs,json}` or `package.json` (tsdown field)
   - Supports multiple loaders: `native` (Node.js native TS), `tsx`, `unrun`, `auto` (intelligent selection)
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

**Core:**

- `rolldown.ts` - Rolldown build options construction
- `hooks.ts` - Hook system implementation using `hookable`
- `plugin.ts` - `TsdownPlugin` interface: Rolldown plugins extended with `tsdownConfig` / `tsdownConfigResolved` hooks

**Rolldown Plugins:**

- `deps.ts` - Dependency management (`deps` options: `alwaysBundle`, `neverBundle`, `onlyBundle`, `onlyImport`, `resolveDepSubpath`)
- `node-protocol.ts` - Handles `node:` protocol additions/stripping
- `shebang.ts` - Preserves shebang lines in output
- `report.ts` - Bundle size reporting
- `watch.ts` - Watch mode change tracking

**Transformations:**

- `entry.ts` - Entry point resolution with glob support (including negation `!pattern`)
- `target.ts` - Compilation targets from package.json or config
- `tsconfig.ts` - TypeScript configuration resolution
- `cjs.ts` - Warns when CJS output targets Node versions that support `require(esm)` (recommends ESM)

**Output Processing:**

- `output.ts` - Chunk filename and extension resolution
- `copy.ts` - Copy static files to dist
- `clean.ts` - Output directory cleanup

**Advanced Features:**

- `pkg/index.ts` - Package bundling orchestration
- `pkg/exports.ts` - Auto-generate package.json exports field
- `pkg/publint.ts` - Package linting
- `pkg/attw.ts` - "Are the types wrong" integration
- `debug.ts` - Debug namespace management
- `devtools.ts` - Vite DevTools integration
- `exe.ts` - Executable bundling (SEA support)
- `shims.ts` - ESM/CJS shim injection
- `shortcuts.ts` - Watch mode keyboard shortcuts

### Plugin Architecture

Plugins follow Rolldown's interface. Internal plugins are added based on config, user plugins append last. User plugins may additionally implement tsdown-specific hooks (`tsdownConfig` to modify user config before resolution, `tsdownConfigResolved` to read the resolved config) — see `src/features/plugin.ts`. The build supports dual-format output (ESM + CJS) with a second pass for CJS type declarations (`cjsDts`).

Public plugin exports in `src/plugins.ts`: `DepsPlugin`, `NodeProtocolPlugin`, `ReportPlugin`, `ShebangPlugin`, `WatchPlugin`

### Key Architectural Patterns

1. **Multi-format builds:** Single config produces ESM + CJS + types. ES format handles types via dts plugin; CJS format has separate dts pass with `emitDtsOnly: true`

2. **Package-aware building:** Detects package.json, auto-generates exports field, validates bundled dependencies, runs package linters

3. **Lazy feature loading:** Optional peer dependencies loaded on-demand (`@tsdown/css`, `@tsdown/exe`, unplugin-unused, tsx, unrun, etc.)

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
src/config/options.ts
src/config/options.test.ts
```

Integration/e2e tests live in `tests/*.test.ts` (e.g. `tests/e2e.test.ts`, `tests/clean.test.ts`).

Example test pattern:

```typescript
import { describe, expect, test } from 'vitest'
import { testBuild } from '../tests/utils.ts'

describe('feature name', () => {
  test('should do something', async (context) => {
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
    expect(snapshot).contain('foo')
    expect(warnings).toHaveLength(0)
  })
})
```

**Snapshot testing:** `testBuild()` automatically compares output files against snapshots in `tests/__snapshots__/` using `expectFilesSnapshot` from `@sxzz/test-utils` (disable with `snapshot: false`); the returned `snapshot` string can be asserted on directly

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

- `native` - Use native TypeScript support (Node.js type stripping, Bun, Deno)
- `tsx` - Load via `tsx` (optional peer dependency)
- `unrun` - Use TypeScript transpiler (optional peer dependency)
- `auto` - Automatically choose based on environment (default): `native` when supported, otherwise `unrun`

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

### Utilities (`src/utils/`)

- `fs.ts` - File system utilities (`fsExists()`, `fsStat()`, `fsRemove()`); use instead of Node.js fs directly
- `logger.ts` - Structured logging (`logger.error()`, `.warn()`, `.info()`, `.debug()`) with colours via `ansis`; respects `logLevel` config
- `chunks.ts` - Chunk manipulation utilities
- `ci.ts` - CI environment detection
- `format.ts` - Formatting utilities (byte sizes, etc.)
- `json.ts` - Format-preserving JSON file writes (indentation, EOL, trailing newline)
- `general.ts` - General utilities (glob resolution, type checking, etc.)
- `package.ts` - Package.json reading and manipulation
- `types.ts` - Shared TypeScript type definitions

### Watch Mode

Watch mode has special behaviors:

- Config file changes trigger full restart (clears module cache)
- Keyboard shortcuts: `r` (reload config and rebuild), `c` (clear console), `q` (quit), `h` (help)
- Build errors don't stop watch mode
- Resources cleaned via `Symbol.asyncDispose` on bundles
