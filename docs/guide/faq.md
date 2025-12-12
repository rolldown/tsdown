# Frequently Asked Questions

## Why tsdown Does Not Support Stub Mode {#stub-mode}

`tsdown` does **not** support stub mode due to several limitations and design considerations:

- **Stub mode requires manual intervention:**
  Whenever you change named exports, you must re-run the stub command to update the stubs. This disrupts the development workflow and can lead to inconsistencies.
- **Stub mode is incompatible with plugins:**
  Stub mode cannot support plugin functionality, which is essential for many advanced use cases and custom build logic.

### Recommended Alternatives

Instead of stub mode, we recommend more reliable and flexible approaches:

1. **Use Watch Mode:**
   The simplest solution is to run `tsdown` in watch mode. This keeps your build up-to-date automatically as you make changes, though it requires you to keep the process running in the background.

2. **Use [`exports.devExports`](../options/package-exports.md#dev-exports) for Dev/Prod Separation:**
   For a more advanced and robust setup, use the `exports.devExports` option to specify different export paths for development and production. This allows you to point to source files during development and built files for production.
   - **If you use plugins:**
     Consider using [vite-node](https://github.com/antfu-collective/vite-node) to run your code directly with plugin support.
   - **If you do not use plugins:**
     You can use lightweight TypeScript runners such as [tsx](https://github.com/privatenumber/tsx), [jiti](https://github.com/unjs/jiti), or [unrun](https://github.com/Gugustinette/unrun).
   - **If you do not use plugins and your code is compatible with Node.js's built-in TypeScript support:**
     With Node.js v22.18.0 and above, you can run TypeScript files directly without any additional runners.

These alternatives provide a smoother and more reliable development experience compared to stub mode, especially as your project grows or requires plugin support. For a more detailed explanation of this decision, please see [this GitHub comment](https://github.com/rolldown/tsdown/pull/164#issuecomment-2849720617).
