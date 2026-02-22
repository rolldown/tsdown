# Skills Generation Information

This document contains information about how these skills were generated and how to keep them synchronized with the documentation.

## Generation Details

**Generated from documentation at:**
- **Commit SHA**: `7949216eb518f4c83b876f808991cf4b0cbc1561`
- **Short SHA**: `7949216`
- **Date**: 2026-02-22
- **Commit**: feat(sea): add exe option for Node.js SEA executable bundling

**Source documentation:**
- Main docs: `/docs` folder
- Project README: `/README.md`
- CLAUDE.md: `/CLAUDE.md`

**Generation date**: 2026-02-22

## Structure

```
skills/
├── GENERATION.md               # This file
└── tsdown/
    ├── README.md               # User-facing README
    ├── SKILL.md                # Main skill file with quick reference
    └── references/             # Detailed reference documentation
```

## File Naming Convention

Files are prefixed by category:
- `guide-*` - Getting started guides and tutorials
- `option-*` - Configuration options
- `advanced-*` - Advanced topics (plugins, hooks, programmatic API)
- `recipe-*` - Framework-specific recipes
- `reference-*` - CLI and API reference

## How Skills Were Generated

The tsdown skills were created by:

1. **Reading core documentation** from `/docs` folder:
   - `/docs/guide/*.md` - Core guides (getting started, migration, FAQ)
   - `/docs/options/*.md` - Configuration options (17 files)
   - `/docs/advanced/*.md` - Advanced features (plugins, hooks, etc.)
   - `/docs/recipes/*.md` - Framework recipes (React, Vue, Solid, Svelte)
   - `/docs/reference/*.md` - CLI reference

2. **Creating main SKILL.md**: Quick reference file with:
   - When to use tsdown
   - Quick start commands
   - Basic configuration examples
   - Core references table
   - Build options table
   - Common patterns and best practices
   - CLI quick reference

3. **Creating reference documentation** (to be generated):
   - Core guides (getting started, migration, etc.)
   - Configuration options (one file per option)
   - Advanced topics (plugins, hooks, programmatic API)
   - Framework recipes (React, Vue, Solid, Svelte)
   - CLI reference

## Updating Skills (For Future Agents)

When tsdown documentation changes, follow these steps to update the skills:

### 1. Check for Documentation Changes

```bash
# Get changes in docs since generation
git diff 7949216..HEAD -- docs/

# List changed files
git diff --name-only 301bcd1..HEAD -- docs/

# Get summary of changes
git log --oneline 301bcd1..HEAD -- docs/
```

### 2. Identify What Changed

Focus on these documentation areas:
- `/docs/guide/` - Getting started, migration, FAQ
- `/docs/options/` - Configuration options
- `/docs/advanced/` - Plugins, hooks, programmatic usage
- `/docs/recipes/` - Framework-specific recipes
- `/docs/reference/` - CLI and API reference

### 3. Update Skills

**For minor changes** (typos, clarifications, small additions):
- Update the relevant section in `SKILL.md`
- Update corresponding file in `references/` if needed

**For major changes**:
- Read the changed documentation files
- Update `SKILL.md` sections:
  - Add new options to appropriate tables
  - Update examples if APIs changed
  - Add to "Common Patterns" if applicable
- Update or add files in `references/`

**For new features**:
- Add documentation file to `references/` with appropriate prefix
  - Rewrite content for agent consumption (concise, actionable)
- Add entry in `SKILL.md` with:
  - Brief description in relevant table
  - Code example in "Common Patterns" if applicable
  - Reference to detailed docs

### 4. Incremental Sync Process

```bash
# 1. Check what docs changed
git diff 7949216..HEAD -- docs/ > docs_changes.patch

# 2. Review the changes
cat docs_changes.patch

# 3. Update references based on changes
# Update or add files in references/

# 4. Update SKILL.md based on changes
# Add new features, update examples, etc.

# 5. Update this file with new SHA
git rev-parse HEAD  # Get new SHA
# Update GENERATION.md with new SHA
```

### 5. Sync Checklist

- [ ] Read diff of docs since last generation
- [ ] Identify new options/features added
- [ ] Identify changed/deprecated options
- [ ] Update `SKILL.md` with changes:
  - [ ] Add new options to appropriate tables
  - [ ] Update changed examples
  - [ ] Remove deprecated options
  - [ ] Update best practices if needed
- [ ] Update `references/` folder:
  - [ ] Add new option/feature docs with category prefix
  - [ ] Update changed option/feature docs
  - [ ] Remove deprecated option/feature docs
- [ ] Update this `GENERATION.md` with new SHA

## Reference Files to Generate

Based on the documentation structure, these reference files should be created:

### Core Guides (4 files)
- `guide-getting-started.md` - Installation, first bundle, CLI basics
- `guide-migrate-from-tsup.md` - Migration guide and compatibility
- `guide-faq.md` - Frequently asked questions
- `guide-introduction.md` - Why tsdown, key features

### Configuration Options (18 files)
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
- `option-watch-mode.md` - Watch mode configuration
- `option-config-file.md` - Config file formats and loading
- `option-shims.md` - ESM/CJS compatibility shims
- `option-cjs-default.md` - CommonJS default export handling
- `option-package-exports.md` - Auto-generate package.json exports
- `option-css.md` - CSS handling and modules
- `option-unbundle.md` - Preserve directory structure
- `option-log-level.md` - Logging configuration
- `option-lint.md` - Package validation (publint, attw)
- `option-exe.md` - Executable bundling (Node.js SEA)

### Advanced Topics (6 files)
- `advanced-plugins.md` - Rolldown, Rollup, Unplugin support
- `advanced-hooks.md` - Lifecycle hooks
- `advanced-programmatic.md` - Node.js API usage
- `advanced-rolldown-options.md` - Pass options to Rolldown
- `advanced-benchmark.md` - Performance benchmarks
- `advanced-ci.md` - CI environment detection and CI-aware options

### Framework Recipes (5 files)
- `recipe-react.md` - React library setup
- `recipe-vue.md` - Vue library setup
- `recipe-solid.md` - Solid library setup
- `recipe-svelte.md` - Svelte library setup
- `recipe-wasm.md` - WASM module support

### Reference (1 file)
- `reference-cli.md` - CLI commands and options

## Maintenance Notes

### Key Sections to Keep Updated

1. **Quick Start** - Update if basic usage changes
2. **Configuration Options** - Add new options, update existing
3. **Common Patterns** - Add new patterns as best practices emerge
4. **Best Practices** - Update based on community feedback
5. **Framework Support** - Update when new frameworks are supported

### When to Regenerate Completely

Consider full regeneration when:
- Major version update (v1.x → v2.x)
- Complete documentation restructure
- Multiple breaking changes
- More than 30% of docs changed

### Style Guidelines

When updating, maintain style:
- Practical, actionable guidance
- Concise code examples
- Focus on common use cases
- Clear descriptions
- Reference detailed docs for deep dives

## Version History

| Date       | SHA      | Changes |
|------------|----------|---------|
| 2026-02-22 | 7949216  | Add `exe` option for Node.js SEA executable bundling |
| 2026-01-30 | 301bcd1  | Add CI environment, package validation (publint/attw), WASM support, update entry globs, sourcemap modes, failOnWarn |
| 2026-01-29 | 0bf92cf  | Initial generation from docs |

## Agent Instructions Summary

**For future agents updating these skills:**

1. Run `git diff 7949216..HEAD -- docs/` to see all documentation changes
2. Read changed files to understand what's new or modified
3. Update `SKILL.md` by:
   - Adding new options to appropriate tables
   - Updating examples for changed APIs
   - Removing deprecated options
   - Adding new patterns or best practices
4. Create/update files in `references/` folder based on changes
5. Update this file with new SHA and date
6. Test that skill content is accurate and follows style

**Remember**: The goal is incremental updates, not complete rewrites. Only change what needs to change based on documentation diffs.

## Questions?

If you're unsure about whether changes warrant updates:
- **Small changes** (typos, clarifications): Optional, can skip
- **New options/features**: Must add to skills
- **Changed APIs**: Must update examples
- **Deprecated options**: Must remove or mark as deprecated
- **New best practices**: Should add to relevant sections

---

Last updated: 2026-02-22
Current SHA: 7949216
