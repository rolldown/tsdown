import type { CopyEntry, CopyOptions, CopyOptionsFn } from '../features/copy.ts'
import type {
  DepsConfig,
  NoExternalFn,
  ResolvedDepsConfig,
} from '../features/deps.ts'
import type { DevtoolsOptions } from '../features/devtools.ts'
import type { ExeOptions, SeaConfig } from '../features/exe.ts'
import type {
  BuildContext,
  RolldownContext,
  TsdownHooks,
} from '../features/hooks.ts'
import type {
  ChunkAddon,
  ChunkAddonFunction,
  ChunkAddonObject,
  OutExtensionContext,
  OutExtensionFactory,
  OutExtensionObject,
} from '../features/output.ts'
import type { AttwOptions } from '../features/pkg/attw.ts'
import type { ExportsOptions } from '../features/pkg/exports.ts'
import type { PublintOptions } from '../features/pkg/publint.ts'
import type { TsdownPlugin, TsdownPluginOption } from '../features/plugin.ts'
import type { ReportOptions } from '../features/report.ts'
import type { RolldownChunk, TsdownBundle } from '../utils/chunks.ts'
import type { Logger, LogLevel } from '../utils/logger.ts'
import type { PackageJsonWithPath, PackageType } from '../utils/package.ts'
import type {
  Arrayable,
  Awaitable,
  MarkPartial,
  Overwrite,
} from '../utils/types.ts'
import type { CssOptions } from '@tsdown/css'
import type { Hookable } from 'hookable'
import type {
  ChecksOptions,
  ExternalOption,
  InputOptions,
  InternalModuleFormat,
  MinifyOptions,
  ModuleFormat,
  ModuleTypes,
  OutputOptions,
  TreeshakingOptions,
} from 'rolldown'
import type { Options as RolldownPluginDtsOptions } from 'rolldown-plugin-dts'
import type { Options as UnusedOptions } from 'unplugin-unused'

export interface DtsOptions extends RolldownPluginDtsOptions {
  /**
   * When building dual ESM+CJS formats, generate a `.d.cts` re-export stub
   * instead of running a full second TypeScript compilation pass.
   *
   * The stub re-exports everything from the corresponding `.d.mts` file,
   * ensuring CJS and ESM consumers share the same type declarations. This
   * eliminates the TypeScript "dual module hazard" where separate `.d.cts`
   * and `.d.mts` declarations cause `TS2352` ("neither type sufficiently
   * overlaps") errors when casting between types derived from the same class.
   *
   * Only applies when building both `esm` and `cjs` formats simultaneously.
   *
   * @default false
   */
  cjsReexport?: boolean
}

export type Sourcemap = boolean | 'inline' | 'hidden'
export type Format = ModuleFormat
export type NormalizedFormat = InternalModuleFormat

/**
 * Extended input option that supports glob negation patterns.
 *
 * When using object form, values can be:
 * - A single glob pattern string
 * - An array of glob patterns, including negation patterns (prefixed with `!`)
 *
 * @example
 * ```ts
 * entry: {
 *   // Single pattern
 *   "utils/*": "./src/utils/*.ts",
 *   // Array with negation pattern to exclude files
 *   "hooks/*": ["./src/hooks/*.ts", "!./src/hooks/index.ts"],
 * }
 * ```
 */
export type TsdownInputOption = Arrayable<
  string | Record<string, Arrayable<string>>
>

export type {
  AttwOptions,
  BuildContext,
  ChunkAddon,
  ChunkAddonFunction,
  ChunkAddonObject,
  CopyEntry,
  CopyOptions,
  CopyOptionsFn,
  DepsConfig,
  DevtoolsOptions,
  ExeOptions,
  ExportsOptions,
  NoExternalFn,
  OutExtensionContext,
  OutExtensionFactory,
  OutExtensionObject,
  PackageJsonWithPath,
  PackageType,
  PublintOptions,
  ReportOptions,
  ResolvedDepsConfig,
  RolldownChunk,
  RolldownContext,
  SeaConfig,
  TreeshakingOptions,
  TsdownBundle,
  TsdownHooks,
  TsdownPlugin,
  TsdownPluginOption,
  UnusedOptions,
}

export interface Workspace {
  /**
   * Workspace directories. Glob patterns are supported.
   * - `auto`: Automatically detect `package.json` files in the workspace.
   * @default 'auto'
   */
  include?: 'auto' | (string & {}) | string[]
  /**
   * Exclude directories from workspace.
   * Defaults to all `node_modules`, `dist`, `test`, `tests`, `temp`, and `tmp` directories.
   *
   * @default ['**\/node_modules/**', '**\/dist/**', '**\/test?(s)/**', '**\/t?(e)mp/**']
   */
  exclude?: Arrayable<string>

  /**
   * Path to the workspace configuration file.
   */
  config?: boolean | string
}

export type CIOption = 'ci-only' | 'local-only'

export type WithEnabled<T> =
  | boolean
  | CIOption
  | (T & {
      /**
       * @default true
       */
      enabled?: boolean | CIOption
    })

/**
 * Options for tsdown.
 */
export interface UserConfig {
  // #region Input Options
  /**
   * Defaults to `'src/index.ts'` if it exists.
   *
   * Supports glob patterns with negation to exclude files:
   * @example
   * ```ts
   * entry: {
   *   "hooks/*": ["./src/hooks/*.ts", "!./src/hooks/index.ts"],
   * }
   * ```
   *
   * @default { index: 'src/index.ts'}
   */
  entry?: TsdownInputOption

  /**
   * Dependency handling options.
   */
  deps?: DepsConfig

  /**
   * @deprecated Use {@linkcode DepsConfig.neverBundle | deps.neverBundle} instead.
   */
  external?: ExternalOption
  /**
   * @deprecated Use {@linkcode DepsConfig.alwaysBundle | deps.alwaysBundle} instead.
   */
  noExternal?: Arrayable<string | RegExp> | NoExternalFn
  /**
   * @deprecated Use {@linkcode DepsConfig.onlyBundle | deps.onlyBundle} instead.
   */
  inlineOnly?: Arrayable<string | RegExp> | false
  /**
   * @deprecated Use {@linkcode DepsConfig.skipNodeModulesBundle | deps.skipNodeModulesBundle} instead.
   * @default false
   */
  skipNodeModulesBundle?: boolean

  alias?: Record<string, string>

  /**
   * @default true
   */
  tsconfig?: string | boolean

  /**
   * Specifies the target runtime platform for the build.
   *
   * - `node`: Node.js and compatible runtimes (e.g., Deno, Bun).
   *   For CJS format, this is always set to `node` and cannot be changed.
   * - `neutral`: A platform-agnostic target with no specific runtime assumptions.
   * - `browser`: Web browsers.
   *
   * @default 'node'
   * @see https://tsdown.dev/options/platform
   */
  platform?: 'node' | 'neutral' | 'browser'

  /**
   * Specifies the compilation target environment(s).
   *
   * Determines the JavaScript version or runtime(s) for which the code should be compiled.
   * If not set, defaults to the value of `engines.node` in your project's `package.json`.
   * If no `engines.node` field exists, no syntax transformations are applied.
   *
   * Accepts a single target (e.g., `'es2020'`, `'node18'`, `'baseline-widely-available'`), an array of targets, or `false` to disable all transformations.
   *
   * @see {@link https://tsdown.dev/options/target#supported-targets} for a list of valid targets and more details.
   *
   * @example
   * ```jsonc
   * // Target a single environment
   * { "target": "node18" }
   * ```
   *
   * @example
   * ```jsonc
   * // Target multiple environments
   * { "target": ["node18", "es2020"] }
   * ```
   *
   * @example
   * ```jsonc
   * // Disable all syntax transformations
   * { "target": false }
   * ```
   */
  target?: string | string[] | false

  /**
   * Compile-time env variables, which can be accessed via `import.meta.env` or `process.env`.
   * @example
   * ```json
   * {
   *   "DEBUG": true,
   *   "NODE_ENV": "production"
   * }
   * ```
   *
   * @default {}
   */
  env?: Record<string, any>
  /**
   * Path to env file providing compile-time env variables.
   * @example
   * `.env`, `.env.production`, etc.
   */
  envFile?: string
  /**
   * When loading env variables from `envFile`, only include variables with these prefixes.
   * @default 'TSDOWN_'
   */
  envPrefix?: string | string[]
  define?: Record<string, string>

  /**
   * @default false
   */
  shims?: boolean

  /**
   * Configure tree shaking options.
   * @see {@link https://rolldown.rs/options/treeshake} for more details.
   * @default true
   */
  treeshake?: boolean | TreeshakingOptions

  /**
   * Sets how input files are processed.
   * For example, use 'js' to treat files as JavaScript or 'base64' for images.
   * Lets you import or require files like images or fonts.
   * @example
   * ```json
   * { ".jpg": "asset", ".png": "base64" }
   * ```
   */
  loader?: ModuleTypes

  /**
   * Remove the `node:` prefix from built-in Node.js module imports.
   * When enabled, rewrites import sources like `node:fs` to `fs`.
   *
   * @default false
   * @deprecated Use {@linkcode nodeProtocol | nodeProtocol: 'strip'} instead.
   *
   * @example
   * <caption>`removeNodeProtocol: true` — remove the `node:` prefix</caption>
   *
   * ```ts
   * // Input
   * import 'node:fs'
   *
   * // Output
   * import 'fs'
   * ```
   */
  removeNodeProtocol?: boolean

  /**
   * Control whether built-in Node.js module imports use the `node:` protocol.
   *
   * - `true`: Add the `node:` prefix to built-in module imports.
   * - `'strip'`: Remove the `node:` prefix from built-in module imports.
   * - `false`: Do not transform built-in module imports.
   *
   * @default false
   *
   * @example
   * <caption>`nodeProtocol: true` — add the `node:` prefix</caption>
   *
   * ```ts
   * // Input
   * import 'fs'
   *
   * // Output
   * import 'node:fs'
   * ```
   *
   * @example
   * <caption>`nodeProtocol: 'strip'` — remove the `node:` prefix</caption>
   *
   * ```ts
   * // Input
   * import 'node:fs'
   *
   * // Output
   * import 'fs'
   * ```
   *
   * @example
   * <caption>`nodeProtocol: false` — do not transform imports</caption>
   *
   * ```ts
   * // Input
   * import 'node:fs'
   *
   * // Output
   * import 'node:fs'
   * ```
   */
  nodeProtocol?: 'strip' | boolean

  /**
   * Controls which warnings are emitted during the build process. Each option can be set to `true` (emit warning) or `false` (suppress warning).
   */
  checks?: ChecksOptions & {
    /**
     * If the config includes the `cjs` format and
     * one of its target >= node 20.19.0 / 22.12.0,
     * warn the user about the deprecation of CommonJS.
     *
     * @default true
     */
    legacyCjs?: boolean
  }

  plugins?: TsdownPluginOption

  /**
   * Use with caution; ensure you understand the implications.
   */
  inputOptions?:
    | InputOptions
    | ((
        options: InputOptions,
        format: NormalizedFormat,
        context: { cjsDts: boolean },
      ) => Awaitable<InputOptions | void | null>)

  //#region Output Options

  /**
   * Output format(s). Available formats are
   * - `esm`: ESM
   * - `cjs`: CommonJS
   * - `iife`: IIFE
   * - `umd`: UMD
   *
   * @default 'esm'
   */
  format?: Format | Format[] | Partial<Record<Format, Partial<ResolvedConfig>>>
  globalName?: string
  /**
   * @default 'dist'
   */
  outDir?: string
  /**
   * Whether to write the files to disk.
   * This option is incompatible with watch mode.
   * @default true
   */
  write?: boolean
  /**
   * Whether to generate source map files.
   *
   * Note that this option will always be `true` if you have
   * {@link https://www.typescriptlang.org/tsconfig/#declarationMap | `declarationMap`}
   * option enabled in your `tsconfig.json`.
   *
   * @default false
   */
  sourcemap?: Sourcemap
  /**
   * Clean directories before build.
   *
   * Default to output directory.
   * @default true
   */
  clean?: boolean | string[]
  /**
   * @default false
   */
  minify?: boolean | 'dce-only' | MinifyOptions
  footer?: ChunkAddon
  banner?: ChunkAddon

  /**
   * Determines whether `unbundle` is enabled.
   * When set to `true`, the output files will mirror the input file structure.
   * @default false
   */
  unbundle?: boolean

  /**
   * Specifies the root directory of input files, similar to TypeScript's `rootDir`.
   * This determines the output directory structure.
   *
   * By default, the root is computed as the common base directory of all entry files.
   *
   * @see https://www.typescriptlang.org/tsconfig/#rootDir
   */
  root?: string

  /**
   * @deprecated Use {@linkcode unbundle} instead.
   * @default true
   */
  bundle?: boolean

  /**
   * Use a fixed extension for output files.
   * The extension will always be `.cjs` or `.mjs`.
   * Otherwise, it will depend on the package type.
   *
   * Defaults to `true` if {@linkcode platform} is set to `node`,
   * `false` otherwise.
   *
   * @default platform === 'node'
   */
  fixedExtension?: boolean

  /**
   * Custom extensions for output files.
   * {@linkcode fixedExtension} will be overridden by this option.
   */
  outExtensions?: OutExtensionFactory

  /**
   * If enabled, appends hash to chunk filenames.
   * @default true
   */
  hash?: boolean

  /**
   * @default true
   */
  cjsDefault?: boolean

  /**
   * Use with caution; ensure you understand the implications.
   */
  outputOptions?:
    | OutputOptions
    | ((
        options: OutputOptions,
        format: NormalizedFormat,
        context: { cjsDts: boolean },
      ) => Awaitable<OutputOptions | void | null>)

  //#region CLI Options

  /**
   * The working directory of the config file.
   * - Defaults to {@linkcode process.cwd | process.cwd()} for root config.
   * - Defaults to the package directory for {@linkcode workspace} config.
   *
   * @default process.cwd()
   */
  cwd?: string

  /**
   * The name to show in CLI output. This is useful for monorepos or workspaces.
   * When using workspace mode, this option defaults to the package name from package.json.
   * In non-workspace mode, this option must be set explicitly for the name to show in the CLI output.
   */
  name?: string

  /**
   * Log level.
   * @default 'info'
   */
  logLevel?: LogLevel
  /**
   * If true, fails the build on warnings.
   * @default false
   */
  failOnWarn?: boolean | CIOption
  /**
   * Custom logger.
   */
  customLogger?: Logger

  /**
   * Reuse config from Vite or Vitest (experimental)
   * @default false
   */
  fromVite?: boolean | 'vitest'

  /**
   * @default false
   */
  watch?: boolean | Arrayable<string>
  /**
   * Files or patterns to not watch while in watch mode.
   */
  ignoreWatch?: Arrayable<string | RegExp>

  /**
   * **[experimental]** Enable devtools.
   *
   * DevTools is still under development, and this is for early testers only.
   *
   * This may slow down the build process significantly.
   *
   * @default false
   */
  devtools?: WithEnabled<DevtoolsOptions>

  //#region Addons

  /**
   * You can specify command to be executed after a successful build, specially useful for Watch mode
   */
  onSuccess?:
    | string
    | ((config: ResolvedConfig, signal: AbortSignal) => void | Promise<void>)

  /**
   * Enables generation of TypeScript declaration files (`.d.ts`).
   *
   * By default, this option is auto-detected based on your project's `package.json`:
   * - If {@linkcode exe} is enabled, declaration file generation is disabled by default.
   * - If the `types` field is present, or if the main `exports` contains a `types` entry, declaration file generation is enabled by default.
   * - Otherwise, declaration file generation is disabled by default.
   */
  dts?: WithEnabled<DtsOptions>

  /**
   * Enable unused dependencies check with `unplugin-unused`
   * Requires `unplugin-unused` to be installed.
   * @default false
   */
  unused?: WithEnabled<UnusedOptions>

  /**
   * Run `publint` after bundling.
   * Requires `publint` to be installed.
   * @default false
   */
  publint?: WithEnabled<PublintOptions>

  /**
   * Run `arethetypeswrong` after bundling.
   * Requires `@arethetypeswrong/core` to be installed.
   *
   * @default false
   * @see https://github.com/arethetypeswrong/arethetypeswrong.github.io
   */
  attw?: WithEnabled<AttwOptions>

  /**
   * Enable size reporting after bundling.
   * @default true
   */
  report?: WithEnabled<ReportOptions>

  /**
   * `import.meta.glob` support.
   * @see https://vite.dev/guide/features.html#glob-import
   * @default true
   */
  globImport?: boolean

  /**
   * Generate package exports for `package.json`.
   *
   * This will set the `main`, `module`, `types`, `exports` fields in `package.json`
   * to point to the generated files.
   *
   * @default false
   */
  exports?: WithEnabled<ExportsOptions>

  /**
   * **[experimental]** CSS options.
   * Requires `@tsdown/css` to be installed.
   */
  css?: CssOptions

  /**
   * @deprecated Use {@linkcode CssOptions.inject | css.inject} instead.
   */
  injectStyle?: boolean

  /**
   * @alias copy
   * @deprecated Alias for {@linkcode copy}, will be removed in the future.
   */
  publicDir?: CopyOptions | CopyOptionsFn

  /**
   * Copy files to another directory.
   * @example
   * ```ts
   * [
   *   'src/assets',
   *   'src/env.d.ts',
   *   'src/styles/**\/*.css',
   *   { from: 'src/assets', to: 'dist/assets' },
   *   { from: 'src/styles/**\/*.css', to: 'dist', flatten: true },
   * ]
   * ```
   */
  copy?: CopyOptions | CopyOptionsFn

  hooks?:
    | Partial<TsdownHooks>
    | ((hooks: Hookable<TsdownHooks>) => Awaitable<void>)

  /**
   * **[experimental]** Bundle as executable using Node.js SEA (Single Executable Applications).
   *
   * This will bundle the output into a single executable file using Node.js SEA.
   * Note that this is only supported on Node.js 25.7.0 and later, and is not supported in Bun or Deno.
   *
   * @default false
   */
  exe?: WithEnabled<ExeOptions>

  /**
   * **[experimental]** Enable workspace mode.
   * This allows you to build multiple packages in a monorepo.
   */
  workspace?: Workspace | Arrayable<string> | true
}

export interface InlineConfig extends UserConfig {
  /**
   * Config file path
   */
  config?: boolean | string

  /**
   * Config loader to use. It can only be set via CLI or API.
   * @default 'auto'
   */
  configLoader?: 'auto' | 'native' | 'unrun'

  /**
   * Filter configs by cwd or name.
   */
  filter?: RegExp | Arrayable<string>
}

export type UserConfigFn = (
  inlineConfig: InlineConfig,
  context: { ci: boolean; rootConfig?: UserConfig },
) => Awaitable<Arrayable<UserConfig>>

export type UserConfigExport = Awaitable<Arrayable<UserConfig> | UserConfigFn>

export type ResolvedConfig = Overwrite<
  MarkPartial<
    Omit<
      UserConfig,
      | 'workspace' // merged
      | 'fromVite' // merged
      | 'publicDir' // deprecated
      | 'bundle' // deprecated
      | 'injectStyle' // deprecated, merged to `css`
      | 'removeNodeProtocol' // deprecated
      | 'external' // deprecated, merged to `deps`
      | 'noExternal' // deprecated, merged to `deps`
      | 'inlineOnly' // deprecated, merged to `deps`
      | 'skipNodeModulesBundle' // deprecated, merged to `deps`
      | 'logLevel' // merge to `logger`
      | 'failOnWarn' // merge to `logger`
      | 'customLogger' // merge to `logger`
      | 'envFile' // merged to `env`
      | 'envPrefix' // merged to `env`
    >,
    | 'globalName'
    | 'inputOptions'
    | 'outputOptions'
    | 'minify'
    | 'define'
    | 'alias'
    | 'onSuccess'
    | 'outExtensions'
    | 'hooks'
    | 'copy'
    | 'loader'
    | 'name'
    | 'banner'
    | 'footer'
    | 'checks'
    | 'css'
  >,
  {
    /**
     * Resolved entry map (after glob expansion)
     */
    entry: Record<string, string>
    /**
     * Original entry config before glob resolution (for watch mode re-globbing)
     */
    rawEntry?: TsdownInputOption
    nameLabel: string | undefined
    format: NormalizedFormat
    target?: string[]
    clean: string[]
    pkg?: PackageJsonWithPath
    nodeProtocol: 'strip' | boolean
    logger: Logger
    ignoreWatch: Array<string | RegExp>
    deps: ResolvedDepsConfig
    /**
     * Resolved root directory of input files
     */
    root: string
    configDeps: Set<string>

    dts: false | DtsOptions
    report: false | ReportOptions
    tsconfig: false | string
    exports: false | ExportsOptions
    devtools: false | DevtoolsOptions
    publint: false | PublintOptions
    attw: false | AttwOptions
    unused: false | UnusedOptions
    exe: false | ExeOptions
  }
>
