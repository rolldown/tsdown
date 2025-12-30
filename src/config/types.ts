import type { CopyEntry, CopyOptions, CopyOptionsFn } from '../features/copy.ts'
import type { CssOptions } from '../features/css.ts'
import type { DebugOptions } from '../features/debug.ts'
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
import type { Hookable } from 'hookable'
import type {
  ExternalOption,
  InputOptions,
  InternalModuleFormat,
  MinifyOptions,
  ModuleFormat,
  ModuleTypes,
  OutputOptions,
  TreeshakingOptions,
} from 'rolldown'
import type { Options as DtsOptions } from 'rolldown-plugin-dts'
import type { Options as UnusedOptions } from 'unplugin-unused'

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
export type TsdownInputOption =
  | string
  | string[]
  | Record<string, string | string[]>

export type {
  AttwOptions,
  BuildContext,
  ChunkAddon,
  ChunkAddonFunction,
  ChunkAddonObject,
  CopyEntry,
  CopyOptions,
  CopyOptionsFn,
  CssOptions,
  DebugOptions,
  DtsOptions,
  ExportsOptions,
  OutExtensionContext,
  OutExtensionFactory,
  OutExtensionObject,
  PackageJsonWithPath,
  PackageType,
  PublintOptions,
  ReportOptions,
  RolldownChunk,
  RolldownContext,
  TreeshakingOptions,
  TsdownBundle,
  TsdownHooks,
  UnusedOptions,
}

export interface Workspace {
  /**
   * Workspace directories. Glob patterns are supported.
   * - `auto`: Automatically detect `package.json` files in the workspace.
   * @default 'auto'
   */
  include?: Arrayable<string> | 'auto'
  /**
   * Exclude directories from workspace.
   * Defaults to all `node_modules`, `dist`, `test`, `tests`, `temp`, and `tmp` directories.
   */
  exclude?: Arrayable<string>

  /**
   * Path to the workspace configuration file.
   */
  config?: boolean | string
}

export type NoExternalFn = (
  id: string,
  importer: string | undefined,
) => boolean | null | undefined | void

export type CIOption = 'ci-only' | 'local-only'

export type WithEnabled<T> =
  | boolean
  | undefined
  | CIOption
  | (T & {
      /** @default true */
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
   */
  entry?: TsdownInputOption

  external?: ExternalOption
  noExternal?: Arrayable<string | RegExp> | NoExternalFn
  /**
   * Bundle only the dependencies listed here; throw an error if any others are missing.
   *
   * Note: Be sure to include all required sub-dependencies as well.
   */
  inlineOnly?: Arrayable<string | RegExp>
  /**
   * Skip bundling `node_modules`.
   * @default false
   */
  skipNodeModulesBundle?: boolean

  alias?: Record<string, string>
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
   * Accepts a single target (e.g., `'es2020'`, `'node18'`), an array of targets, or `false` to disable all transformations.
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

  /** @default false */
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
   * { '.jpg': 'asset', '.png': 'base64' }
   * ```
   */
  loader?: ModuleTypes

  /**
   * If enabled, strips the `node:` protocol prefix from import source.
   *
   * @default false
   * @deprecated Use `nodeProtocol: 'strip'` instead.
   *
   * @example
   * // With removeNodeProtocol enabled:
   * import('node:fs'); // becomes import('fs')
   */
  removeNodeProtocol?: boolean

  /**
   * - If `true`, add `node:` prefix to built-in modules.
   * - If `'strip'`, strips the `node:` protocol prefix from import source.
   * - If `false`, does not modify the import source.
   *
   * @default false
   *
   * @example
   * // With nodeProtocol enabled:
   * import('fs'); // becomes import('node:fs')
   * // With nodeProtocol set to 'strip':
   * import('node:fs'); // becomes import('fs')
   * // With nodeProtocol set to false:
   * import('node:fs'); // remains import('node:fs')
   *
   */
  nodeProtocol?: 'strip' | boolean

  plugins?: InputOptions['plugins']

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

  /** @default 'es' */
  format?: Format | Format[] | Partial<Record<Format, Partial<ResolvedConfig>>>
  globalName?: string
  /** @default 'dist' */
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
   * [`declarationMap`](https://www.typescriptlang.org/tsconfig/#declarationMap)
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
   * Determines whether unbundle mode is enabled.
   * When set to true, the output files will mirror the input file structure.
   * @default false
   */
  unbundle?: boolean

  /**
   * @deprecated Use `unbundle` instead.
   * @default true
   */
  bundle?: boolean

  /**
   * Use a fixed extension for output files.
   * The extension will always be `.cjs` or `.mjs`.
   * Otherwise, it will depend on the package type.
   *
   * Defaults to `true` if `platform` is set to `node`, `false` otherwise.
   */
  fixedExtension?: boolean

  /**
   * Custom extensions for output files.
   * `fixedExtension` will be overridden by this option.
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
   * - Defaults to `process.cwd()` for root config.
   * - Defaults to the package directory for workspace config.
   */
  cwd?: string

  /**
   * The name to show in CLI output. This is useful for monorepos or workspaces.
   * When using workspace mode, this option defaults to the package name from package.json.
   * In non-workspace mode, this option must be set explicitly for the name to show in the CLI output.
   */
  name?: string

  /**
   * @default false
   * @deprecated Use `logLevel` instead.
   */
  silent?: boolean

  /**
   * Log level.
   * @default 'info'
   */
  logLevel?: LogLevel
  /**
   * If true, fails the build on warnings.
   * @default 'ci-only'
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
   * **[experimental]** Enable debug mode.
   *
   * Both debug mode and Vite DevTools are still under development, and this is for early testers only.
   *
   * This may slow down the build process significantly.
   *
   * @default false
   */
  debug?: WithEnabled<DebugOptions>

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
   * Run publint after bundling.
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
   */
  exports?: WithEnabled<ExportsOptions>

  /**
   * **[experimental]** CSS options.
   */
  css?: CssOptions

  /**
   * @deprecated Alias for `copy`, will be removed in the future.
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
  context: { ci: boolean },
) => Awaitable<Arrayable<UserConfig>>

export type UserConfigExport = Awaitable<Arrayable<UserConfig> | UserConfigFn>

export type ResolvedConfig = Overwrite<
  MarkPartial<
    Omit<
      UserConfig,
      | 'workspace' // merged
      | 'fromVite' // merged
      | 'publicDir' // deprecated
      | 'silent' // deprecated
      | 'bundle' // deprecated
      | 'removeNodeProtocol' // deprecated
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
    | 'external'
    | 'onSuccess'
    | 'outExtensions'
    | 'hooks'
    | 'copy'
    | 'loader'
    | 'name'
    | 'banner'
    | 'footer'
  >,
  {
    /** Resolved entry map (after glob expansion) */
    entry: Record<string, string>
    nameLabel: string | undefined
    format: NormalizedFormat
    target?: string[]
    clean: string[]
    pkg?: PackageJsonWithPath
    nodeProtocol: 'strip' | boolean
    logger: Logger
    ignoreWatch: Array<string | RegExp>
    noExternal?: NoExternalFn
    inlineOnly?: Array<string | RegExp>
    css: Required<CssOptions>

    dts: false | DtsOptions
    report: false | ReportOptions
    tsconfig: false | string
    exports: false | ExportsOptions
    debug: false | DebugOptions
    publint: false | PublintOptions
    attw: false | AttwOptions
    unused: false | UnusedOptions
  }
>
