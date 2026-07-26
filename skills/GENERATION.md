# Skills Generation Information

This document contains information about how these skills were generated and how to keep them synchronized with the documentation.

## Generation Details

**Generated from documentation at:**

- **Commit SHA**: `826755e`
- **Date**: 2026-07-27
- **Commit**: perf: remove `asyncDispose` polyfill (v0.23.0-beta.1)

**Source documentation:**

- Main docs: `/docs` folder
- Project README: `/README.md`
- CLAUDE.md: `/CLAUDE.md`

**Generation date**: 2026-07-27

## Structure

```
skills/
├── GENERATION.md               # This file
├── tsdown/
│   ├── README.md               # User-facing README
│   ├── SKILL.md                # Main skill file with quick reference
│   └── references/             # Detailed reference documentation (38 files)
└── tsdown-migrate/
    ├── README.md               # User-facing README
    ├── SKILL.md                # Migration knowledge base for AI agents
    └── references/             # Detailed migration reference (3 files)
```

## File Naming Convention

Files are prefixed by category:

- `guide-*` - Getting started guides and tutorials
- `option-*` - Configuration options
- `advanced-*` - Advanced topics (plugins, hooks, programmatic API)
- `recipe-*` - Framework-specific recipes
- `reference-*` - CLI and API reference

## Reference Files

### Core Guides (3 files)

- `guide-getting-started.md` - Installation, first bundle, CLI basics
- `guide-migrate-from-tsup.md` - Migration guide and compatibility
- `guide-introduction.md` - Why tsdown, key features

### Configuration Options (23 files)

- `option-entry.md` - Entry point configuration
- `option-output-format.md` - Output formats (ESM, CJS, IIFE, UMD)
- `option-output-directory.md` - Output directory and extensions
- `option-target.md` - Target environment (ES2020, ESNext, etc.)
- `option-platform.md` - Platform (node, browser, neutral)
- `option-dts.md` - TypeScript declaration generation
- `option-sourcemap.md` - Source map generation
- `option-minification.md` - Minification (oxc, terser)
- `option-tree-shaking.md` - Tree shaking configuration
- `option-dependencies.md` - External and inline dependencies
- `option-cleaning.md` - Output directory cleaning
- `option-copy.md` - Copy static files to output directory
- `option-watch-mode.md` - Watch mode configuration
- `option-config-file.md` - Config file formats and loading
- `option-shims.md` - ESM/CJS compatibility shims
- `option-cjs-default.md` - CommonJS default export handling
- `option-package-exports.md` - Auto-generate package.json exports
- `option-css.md` - CSS handling (preprocessors, Lightning CSS, PostCSS, code splitting, inject)
- `option-unbundle.md` - Preserve directory structure
- `option-root.md` - Root directory of input files
- `option-log-level.md` - Logging configuration
- `option-lint.md` - Package validation (publint, attw)
- `option-exe.md` - Executable bundling (Node.js SEA)

### Advanced Topics (6 files)

- `advanced-plugins.md` - Rolldown, Rollup, Unplugin support
- `advanced-hooks.md` - Lifecycle hooks
- `advanced-programmatic.md` - Node.js API usage
- `advanced-rolldown-options.md` - Pass options to Rolldown
- `advanced-ci.md` - CI environment detection and CI-aware options
- `advanced-benchmark.md` - Performance benchmarks

### Framework Recipes (5 files)

- `recipe-react.md` - React library setup
- `recipe-vue.md` - Vue library setup
- `recipe-solid.md` - Solid library setup
- `recipe-svelte.md` - Svelte library setup
- `recipe-wasm.md` - WASM module support

### Reference (1 file)

- `reference-cli.md` - CLI commands and options

## How to Update Skills

When tsdown documentation changes:

### 1. Check for Documentation Changes

```bash
# Get changes in docs since generation
git diff 826755e..HEAD -- docs/

# List changed files
git diff --name-only 826755e..HEAD -- docs/

# Get summary of changes
git log --oneline 826755e..HEAD -- docs/
```

### 2. Update Process

**For minor changes** (typos, clarifications):

- Update the relevant reference file in `references/`
- Update `SKILL.md` if the change affects quick reference tables

**For new features/options:**

- Add reference file in `references/` with appropriate prefix
- Add entry to relevant table in `SKILL.md`
- Update this file's reference list

**For breaking changes:**

- Update affected reference files
- Update `SKILL.md` examples
- Update `GENERATION.md` with new SHA

### 3. Update Checklist

- [ ] Read diff of docs since last generation
- [ ] Update affected files in `references/`
- [ ] Update `SKILL.md` tables and examples
- [ ] Update `references/README.md` file list
- [ ] Update this `GENERATION.md` with new SHA and date

## Style Guidelines

- Practical, actionable guidance
- Concise code examples
- Focus on common use cases
- Reference detailed docs for deep dives

## Version History

| Date       | SHA     | Changes                                                                |
| ---------- | ------- | ---------------------------------------------------------------------- |
| 2026-03-08 | 8e3fa9c | Full refresh: all docs reviewed, 35 reference files, complete coverage |
| 2026-03-16 | — | Added tsdown-migrate skill with 3 reference files for AI-driven migration |
| 2026-07-27 | 826755e | Refresh for v0.23: removed tsup compat options, `skipNodeModulesBundle`, `deps.onlyAllowBundle`, `dts.cjsReexport`; added `option-copy.md`; new `deps` options (`neverBundle: true`, `onlyImport`, `resolveDepSubpath`), `tsx` config loader, `--concurrency`, CSS modules, exe custom Node source; Node.js `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0`; two-stage tsup migration via v0.22.14 |

---

Last updated: 2026-07-27
Current SHA: 826755e
