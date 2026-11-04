---
name: tsdown
description: Bundle TypeScript and JavaScript libraries with blazing-fast speed powered by Rolldown. Use when building libraries, generating type declarations, bundling for multiple formats, or migrating from tsup.
---

# tsdown

This package ships only a pointer to the full tsdown skill, which lives on GitHub to keep the npm package small.

## Step 1: Find the installed version

Read the `version` field of `node_modules/tsdown/package.json`.

## Step 2: Read the full skill for that version

Fetch the skill that matches the installed version, replacing `<version>` with it:

```
https://raw.githubusercontent.com/rolldown/tsdown/v<version>/skills/tsdown/SKILL.md
```

Read it completely before writing tsdown config or code. Its links to `references/*.md` are relative to that URL, so fetch them from:

```
https://raw.githubusercontent.com/rolldown/tsdown/v<version>/skills/tsdown/references/<file>.md
```

If the tag does not exist (e.g. a prerelease or local build), use `main` instead of `v<version>`.

To browse the skill: https://github.com/rolldown/tsdown/tree/main/skills/tsdown

## More

- Documentation: https://tsdown.dev
- Documentation for LLMs: https://tsdown.dev/llms.txt
- Migrating from tsup: https://github.com/rolldown/tsdown/tree/main/skills/tsdown-migrate
