# Platform

The platform specifies the target runtime environment for the bundled JavaScript code.

By default, `tsdown` bundles for the `node` runtime, but you can customize it using the `--platform` option:

```bash
tsdown --platform node    # default
tsdown --platform browser
tsdown --platform neutral
```

### Available Platforms

- **`node`:** Targets the [Node.js](https://nodejs.org/) runtime and compatible environments such as Deno and Bun. This is the default platform, and Node.js built-in modules (e.g., `fs`, `path`) will be resolved automatically. Ideal for toolchains or server-side projects.
- **`browser`:** Targets web browsers (e.g., Chrome, Firefox). This is suitable for front-end projects. If your code uses Node.js built-in modules, a warning will be displayed, and you may need to use polyfills or shims to ensure compatibility.
- **`neutral`:** A platform-agnostic target with no specific runtime assumptions. Use this if your code is intended to run in multiple environments or you want full control over runtime behavior. This is particularly useful for libraries or shared code that may be used in both Node.js and browser environments.

> [!NOTE]
> For the CJS format, the platform is always set to `'node'` and cannot be changed. [Why?](https://github.com/rolldown/rolldown/pull/4693#issuecomment-2912229545)

### Example

```bash
# Bundle for Node.js (default)
tsdown --platform node

# Bundle for browsers
tsdown --platform browser

# Bundle for a neutral platform
tsdown --platform neutral
```

> [!TIP]
> Choosing the right platform ensures your code is optimized for its intended runtime. For example, use `browser` for front-end projects, `node` for server-side applications, and `neutral` for universal libraries.


### Module Resolution

Different platforms use different resolve strategies for package entry points. The `mainFields` option determines which fields in `package.json` are checked:

- **`node`:** `['main', 'module']`
- **`browser`:** `['browser', 'module', 'main']`
- **`neutral`:** `[]` (relies solely on the `exports` field)

When using the `neutral` platform, packages without an `exports` field may cause resolution issues. If you encounter warnings like:

```
Help: The "main" field here was ignored. Main fields must be configured explicitly when using the "neutral" platform.
```

Configure `mainFields` explicitly in `inputOptions.resolve`:

```ts
export default defineConfig({
  platform: 'neutral',
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main'],
    },
  },
})
```

See the [Rolldown resolve options documentation](https://rolldown.rs/options/resolve#mainfields) for more details.

