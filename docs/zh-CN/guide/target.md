# Target

The `target` setting determines which JavaScript features are downleveled (transformed to older syntax) and which are left intact in the output. This allows you to control the compatibility of your bundled code with specific environments or JavaScript versions.

For example, an arrow function `() => this` will be transformed into an equivalent `function` expression if the target is `es5` or lower.

> [!WARNING] Syntax Downgrade Only
> The `target` option only affects syntax transformations. It does not include runtime polyfills or shims for APIs that may not exist in the target environment. For example, if your code uses `Promise`, it will not be polyfilled for environments that lack native `Promise` support.

### Customizing the Target

You can specify the target using the `--target` option:

```bash
tsdown --target <target>
```

### Supported Targets

`tsdown` supports a wide range of targets, including:

- **ECMAScript versions:** `es5`, `es2015`, `es2020`, `esnext`, etc.
- **Browser versions:** `chrome100`, `safari18`, `firefox110`, etc.
- **Node.js versions:** `node20.18`, `node16`, etc.

### Example

```bash
tsdown --target es2020
```

You can also pass an **array of targets** to ensure compatibility across multiple environments. For example:

```bash
tsdown --target chrome100 --target node20.18
```
