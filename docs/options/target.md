# Target

The `target` setting determines which JavaScript and CSS features are downleveled (transformed to older syntax) and which are left intact in the output. This allows you to control the compatibility of your bundled code with specific environments or JavaScript versions.

For example, a logical assignment `a ||= b` will be transformed into an equivalent `a || (a = b)` expression if the target is `es2015`.

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

- ECMAScript versions: `es2015`, `es2020`, `esnext`, etc.
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

### Decorator Support

There are currently two major implementations of decorators in the JavaScript ecosystem:

- **Stage 2 (Legacy) Decorators**: The older, experimental implementation, often referred to as "legacy decorators."
- **Stage 3 Decorators**: The latest official proposal, which is significantly different from the legacy version.

If you are using **stage 2 (legacy) decorators**, make sure to enable the `experimentalDecorators` option in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

If you need to use the **latest TC39 Stage 3 decorators**, please note that `tsdown` (and its underlying engines, Rolldown/Oxc) **do not currently support this feature**. For more information and updates on Stage 3 decorator support, see [this GitHub issue](https://github.com/oxc-project/oxc/issues/9170#issuecomment-3354571325).

> **Note:**
> The two decorator implementations are very different. Make sure you are using the correct configuration and syntax for your chosen decorator version.

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
