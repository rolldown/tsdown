# Dependencies

When bundling with `tsdown`, dependencies are handled intelligently to ensure your library remains lightweight and easy to consume. Here’s how `tsdown` processes different types of dependencies and how you can customize this behavior.

## Default Behavior

### `dependencies` and `peerDependencies`

By default, `tsdown` **does not bundle dependencies** listed in your `package.json` under `dependencies` and `peerDependencies`:

- **`dependencies`**: These are treated as external and will not be included in the bundle. Instead, they will be installed automatically by npm (or other package managers) when your library is installed.
- **`peerDependencies`**: These are also treated as external. Users of your library are expected to install these dependencies manually, although some package managers may handle this automatically.

### `devDependencies` and Phantom Dependencies

- **`devDependencies`**: Dependencies listed under `devDependencies` in your `package.json` will **only be bundled if they are actually imported or required by your source code**.
- **Phantom Dependencies**: Dependencies that exist in your `node_modules` folder but are not explicitly listed in your `package.json` will **only be bundled if they are actually used in your code**.

In other words, only the `devDependencies` and phantom dependencies that are actually referenced in your project will be included in the bundle.

## Skipping Node Modules Bundling

If you want to **skip resolving and bundling all dependencies from `node_modules`**, you can enable the `skipNodeModulesBundle` option in your configuration:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  skipNodeModulesBundle: true,
})
```

This will prevent `tsdown` from parsing and bundling any dependencies from `node_modules`, regardless of how they are referenced in your code.

## Strict Inline Control with `inlineOnly`

The `inlineOnly` option acts as a whitelist for dependencies that are allowed to be bundled from `node_modules`. If any dependency not in the list is found in the bundle, tsdown will throw an error. This is useful for preventing unexpected dependencies from being silently inlined into your output, especially in large projects.

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  inlineOnly: ['cac', 'bumpp'],
})
```

In this example, only `cac` and `bumpp` are allowed to be bundled. If any other `node_modules` dependency is imported, tsdown will throw an error with a message indicating which dependency was unexpectedly bundled and which files imported it.

### Behavior

- **`inlineOnly` is an array** (e.g., `['cac', /^my-/]`): Only dependencies matching the list are allowed to be bundled. An error is thrown for any others. Unused patterns in the list will also be reported.
- **`inlineOnly` is `false`**: All warnings and checks about bundled dependencies are suppressed.
- **`inlineOnly` is not set** (default): A warning is shown if any `node_modules` dependencies are bundled, suggesting you add the `inlineOnly` option or set it to `false` to suppress warnings.

::: tip
Make sure to include all required sub-dependencies in the `inlineOnly` list as well, not just the top-level packages you directly import.
:::

## Customizing Dependency Handling

`tsdown` provides two options to override the default behavior:

### `external`

The `external` option allows you to explicitly mark certain dependencies as external, ensuring they are not bundled into your library. For example:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  external: ['lodash', /^@my-scope\//],
})
```

In this example, `lodash` and all packages under the `@my-scope` namespace will be treated as external.

### `noExternal`

The `noExternal` option allows you to force certain dependencies to be bundled, even if they are listed in `dependencies` or `peerDependencies`. For example:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  noExternal: ['some-package'],
})
```

Here, `some-package` will be bundled into your library.

## Handling Dependencies in Declaration Files

The bundling logic for declaration files is consistent with JavaScript: dependencies are bundled or marked as external according to the same rules and options.

### Resolver Option

When bundling complex third-party types, you may encounter cases where the default resolver (Oxc) cannot handle certain scenarios. For example, the types for `@babel/generator` are located in the `@types/babel__generator` package, which may not be resolved correctly by Oxc.

To address this, you can set the `resolver` option to `tsc` in your configuration. This uses the native TypeScript resolver, which is slower but much more compatible with complex type setups:

```ts [tsdown.config.ts]
import { defineConfig } from 'tsdown'

export default defineConfig({
  dts: {
    resolver: 'tsc',
  },
})
```

## Summary

- **Default Behavior**:
  - `dependencies` and `peerDependencies` are treated as external and not bundled.
  - `devDependencies` and phantom dependencies are only bundled if they are actually used in your code.
- **Customization**:
  - Use `inlineOnly` to whitelist dependencies allowed to be bundled, and throw an error for any others.
  - Use `external` to mark specific dependencies as external.
  - Use `noExternal` to force specific dependencies to be bundled.
  - Use `skipNodeModulesBundle` to skip resolving and bundling all dependencies from `node_modules`.
- **Declaration Files**:
  - The bundling logic for declaration files is now the same as for JavaScript.
  - Use `resolver: 'tsc'` for better compatibility with complex third-party types.

By understanding and customizing dependency handling, you can ensure your library is optimized for both size and usability.
