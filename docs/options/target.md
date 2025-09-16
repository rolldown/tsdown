# Target

The `target` setting determines which JavaScript and CSS features are downleveled (transformed to older syntax) and which are left intact in the output. This allows you to control the compatibility of your bundled code with specific environments or JavaScript versions.

For example, an arrow function `() => this` will be transformed into an equivalent `function` expression if the target is `es5` or lower.

> [!WARNING] Syntax Downgrade Only
> The `target` option only affects syntax transformations. It does not include runtime polyfills or shims for APIs that may not exist in the target environment. For example, if your code uses `Promise`, it will not be polyfilled for environments that lack native `Promise` support.

## Default Target Behavior

By default, `tsdown` will read the `engines.node` field from your `package.json` and automatically set the target to the minimum compatible Node.js version specified. This ensures your output is compatible with the environments you declare for your package.

For example, if your `package.json` contains:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

Then `tsdown` will automatically set the target to `node18.0.0`.

If you want to override this behavior, you can specify the target explicitly using the CLI or configuration file.

## Disabling Target Transformations

You can disable all syntax transformations by setting the target to `false`. This will preserve modern JavaScript and CSS syntax in the output, regardless of the environment specified in your `package.json`.

```json
{
  "target": false
}
```

When `target` is set to `false`:

- No JavaScript syntax downleveling occurs (modern features like optional chaining `?.`, nullish coalescing `??`, etc. are preserved)
- No CSS syntax transformations are applied (modern CSS features like nesting are preserved)
- No runtime helper plugins are loaded
- The output will use the exact syntax from your source code

This is particularly useful when:

- You're targeting modern environments that support the latest JavaScript/CSS features
- You want to handle syntax transformations in a different build step
- You're building a library that will be further processed by the consuming application

> [!NOTE] No Target Resolution
> If you don't specify a `target` and your `package.json` doesn't have an `engines.node` field, `tsdown` will behave as if `target: false` was set, preserving all modern syntax.

## Customizing the Target

You can specify the target using the `--target` option:

```bash
tsdown --target <target>
```

### Supported Targets

- ECMAScript versions: `es5`, `es2015`, `es2020`, `esnext`, etc.
- Browser versions: `chrome100`, `safari18`, `firefox110`, etc.
- Node.js versions: `node20.18`, `node16`, etc.

### Example

```bash
tsdown --target es2020
```

You can also pass an array of targets to ensure compatibility across multiple environments:

```bash
tsdown --target chrome100 --target node20.18
```

# CSS Targeting

`tsdown` can also downlevel CSS features to match your specified browser targets. For example, a CSS nesting `&` selector will be flattened if the target is `chrome108` or lower.

To enable CSS downleveling, you need to manually install [`unplugin-lightningcss`](https://github.com/unplugin/unplugin-lightningcss):

::: code-group

```sh [npm]
npm install -D unplugin-lightningcss
```

```sh [pnpm]
pnpm add -D unplugin-lightningcss
```

```sh [yarn]
yarn add -D unplugin-lightningcss
```

```sh [bun]
bun add -D unplugin-lightningcss
```

:::

Once installed, simply set your browser target (for example, `target: 'chrome100'`) in your configuration or CLI options, and CSS downleveling will be enabled automatically.

For more information on browser targets and CSS compatibility, refer to the [Lightning CSS documentation](https://lightningcss.dev/).
