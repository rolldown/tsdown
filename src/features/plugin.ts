import type {
  InlineConfig,
  ResolvedConfig,
  UserConfig,
} from '../config/types.ts'
import type { Awaitable } from '../utils/types.ts'
import type { Plugin, RolldownPlugin, RolldownPluginOption } from 'rolldown'

/**
 * A tsdown-aware plugin. Extends Rolldown's `Plugin` with tsdown-specific
 * lifecycle hooks.
 *
 * Plugins that only use Rolldown's own lifecycle continue to work unchanged;
 * tsdown detects these optional methods via runtime duck-typing.
 */
export interface TsdownPlugin<A = any> extends Plugin<A> {
  /**
   * Modify tsdown's user config before it is resolved. Analogous to Vite's
   * [`config`](https://vite.dev/guide/api-plugin.html#config) hook.
   *
   * The hook may mutate `config` in place, or return a partial {@link UserConfig}
   * that will be deep-merged into the current config. Array fields are
   * replaced (not concatenated) during merging — to append plugins, mutate
   * `config.plugins` in place.
   *
   * The second argument is the original {@link InlineConfig} passed to
   * `build()` (typically the CLI flags), useful for distinguishing values
   * that came from the command line vs. the config file.
   *
   * Plugins injected via `fromVite` do not receive this hook, because they
   * are loaded after the tsdownConfig phase. Likewise, new plugins added by
   * another plugin's `tsdownConfig` do not themselves receive this hook
   * (plugins are snapshotted before dispatch).
   */
  tsdownConfig?: (
    config: UserConfig,
    inlineConfig: InlineConfig,
  ) => Awaitable<UserConfig | void | null>
  /**
   * Called after tsdown has fully resolved the user config. Analogous to
   * Vite's [`configResolved`](https://vite.dev/guide/api-plugin.html#configresolved)
   * hook.
   *
   * This hook fires once per produced {@link ResolvedConfig} — i.e. once
   * per output format when `format` is an array. Typical usage is to stash
   * the resolved config for later use in Rolldown hooks. Mutations made to
   * `resolvedConfig` here are not supported.
   */
  tsdownConfigResolved?: (resolvedConfig: ResolvedConfig) => Awaitable<void>
}

/**
 * A tsdown plugin slot — accepts tsdown plugins, any Rolldown plugin form,
 * `null`/`undefined`/`false`, promises, and nested arrays. Mirrors Rolldown's
 * {@link RolldownPluginOption} but with {@link TsdownPlugin} as the atom so
 * that tsdown-specific hooks are type-checked.
 */
export type TsdownPluginOption<A = any> = Awaitable<
  | TsdownPlugin<A>
  | RolldownPlugin<A>
  | { name: string }
  | null
  | undefined
  | false
  | TsdownPluginOption<A>[]
>

export async function flattenPlugins(
  plugins: TsdownPluginOption | RolldownPluginOption,
): Promise<Plugin[]> {
  const awaited = await plugins
  if (!awaited) return []
  if (Array.isArray(awaited)) {
    const nested = await Promise.all(awaited.map(flattenPlugins))
    return nested.flat()
  }
  return [awaited as Plugin]
}

/** Type guard: does this plugin implement {@link TsdownPlugin.tsdownConfig}? */
export function hasTsdownConfig(plugin: Plugin): plugin is TsdownPlugin & {
  tsdownConfig: NonNullable<TsdownPlugin['tsdownConfig']>
} {
  return typeof (plugin as TsdownPlugin).tsdownConfig === 'function'
}

/** Type guard: does this plugin implement {@link TsdownPlugin.tsdownConfigResolved}? */
export function hasTsdownConfigResolved(
  plugin: Plugin,
): plugin is TsdownPlugin & {
  tsdownConfigResolved: NonNullable<TsdownPlugin['tsdownConfigResolved']>
} {
  return typeof (plugin as TsdownPlugin).tsdownConfigResolved === 'function'
}
