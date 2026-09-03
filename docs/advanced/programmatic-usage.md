# Programmatic Usage

You can use `tsdown` directly from your JavaScript or TypeScript code. This is useful for custom build scripts, integrations, or advanced automation.

## Example

```ts twoslash
import { build } from 'tsdown'

await build({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  // ...any other options
})
```

## In-Memory Output

Set `write: false` to access generated chunks and assets without writing the
bundle output to disk:

```ts twoslash
import { build } from 'tsdown'

const { bundles } = await build({
  entry: ['src/index.ts'],
  format: 'esm',
  write: false,
  clean: false,
})

for (const bundle of bundles) {
  for (const output of bundle.chunks) {
    const contents = output.type === 'chunk' ? output.code : output.source
    console.log(output.fileName, contents)
  }
}
```

`build()` returns a `TsdownHandle`. Its `bundles` array contains one bundle for
each resolved configuration. In watch mode, `watch.restart()` restarts the build
and resolves to the new handle, while `watch.close()` gracefully closes all
watchers. Each handle can only be restarted once. Even a single configuration
produces an array; its in-memory Rolldown outputs are available in
`bundle.chunks`.

The `write` option controls Rolldown's bundle output, while other file operations
are configured separately. For example, `clean` defaults to `true`, so set
`clean: false` as above if existing output directories must remain untouched.
Explicitly enabled features such as `copy` or `exports` may still write files.
`write: false` is incompatible with watch mode.

All CLI options are available as properties in the options object. See [Config Options](../reference/api/Interface.UserConfig.md) for the full list.
