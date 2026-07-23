# Package.json Migration

How to update package.json when migrating from tsup to tsdown.

## Scripts

Replace all occurrences of `tsup` and `tsup-node` with `tsdown`:

```json
// Before
{
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm",
    "dev": "tsup --watch",
    "build:node": "tsup-node src/server.ts"
  }
}

// After
{
  "scripts": {
    "build": "tsdown src/index.ts --format cjs,esm",
    "dev": "tsdown --watch",
    "build:node": "tsdown src/server.ts"
  }
}
```

## Dependencies

Rename `tsup` to `tsdown` in whichever dependency field it appears:

```json
// Before
{
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}

// After
{
  "devDependencies": {
    "tsdown": "^0.22.13",
    "typescript": "^5.0.0"
  }
}
```

Use `^0.22.13` — the last tsdown version that still accepts deprecated tsup-compatible options (with warnings). Resolve all deprecation warnings before upgrading tsdown to the latest version.

### All Dependency Fields

| Field | tsup version | tsdown version |
|-------|-------------|----------------|
| `dependencies` | any | `^0.22.13` |
| `devDependencies` | any | `^0.22.13` |
| `optionalDependencies` | any | `^0.22.13` |
| `peerDependencies` | any | `*` |
| `peerDependenciesMeta` | rename key only | rename key only |

## Root Config Field

If the project uses inline config in package.json (root-level `tsup` field), rename to `tsdown`:

```json
// Before
{
  "name": "my-lib",
  "tsup": {
    "entry": ["src/index.ts"],
    "format": ["cjs", "esm"],
    "dts": true
  }
}

// After
{
  "name": "my-lib",
  "tsdown": {
    "entry": ["src/index.ts"],
    "format": ["cjs", "esm"],
    "dts": true
  }
}
```

Note: Option mappings (entryPoints→entry, etc.) also apply inside the root config field.

## Related

- [guide-option-mappings.md](guide-option-mappings.md) - Config option transforms
- [guide-differences-detailed.md](guide-differences-detailed.md) - Feature comparison
