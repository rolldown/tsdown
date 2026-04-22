import type {
  InlineConfig,
  ResolvedConfig,
  UserConfig,
} from '../config/types.ts'
import type { Awaitable } from '../utils/types.ts'
import type { Plugin, RolldownPlugin, RolldownPluginOption } from 'rolldown'

/**
 * A tsdown-aware plugin. Extends Rolldown's {@linkcode Plugin} with
 * tsdown-specific lifecycle hooks.
 *
 * Plugins that only use Rolldown's own lifecycle continue to work unchanged;
 * tsdown detects these optional methods via runtime duck-typing.
 */
export interface TsdownPlugin<A = any> extends Plugin<A> {
  /**
   * Modify tsdown's user config before it is resolved. Analogous to Vite's
   * [`config`](https://vite.dev/guide/api-plugin.html#config) hook.
   *
   * The hook may mutate {@linkcode config} in place, or return a partial
   * {@linkcode UserConfig} that will be deep-merged into the current config.
   * Array fields are replaced (not concatenated) during merging — to append
   * plugins, mutate {@linkcode UserConfig.plugins | config.plugins} in place.
   *
   * The second argument is the original {@linkcode InlineConfig} passed to
   * {@linkcode build | build()} (typically the CLI flags), useful for
   * distinguishing values that came from the command line vs. the config file.
   *
   * Plugins injected via {@linkcode fromVite} do not receive this hook,
   * because they are loaded after the {@linkcode tsdownConfig} phase.
   * Likewise, new plugins added by another plugin's {@linkcode tsdownConfig}
   * do not themselves receive this hook
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
   * This hook fires once per produced {@linkcode ResolvedConfig} — i.e. once
   * per output format when {@linkcode UserConfig.format | format} is an array.
   * Typical usage is to stash the resolved config for later use in
   * Rolldown hooks. Mutations made to {@linkcode resolvedConfig} here are
   * not supported.
   */
  tsdownConfigResolved?: (resolvedConfig: ResolvedConfig) => Awaitable<void>
}

/**
 * A tsdown plugin slot — accepts tsdown plugins, any Rolldown plugin form,
 * `null`/`undefined`/`false`, {@linkcode Promise | promises}, and
 * nested arrays. Mirrors Rolldown's {@linkcode RolldownPluginOption} but with
 * {@linkcode TsdownPlugin} as the atom so that tsdown-specific hooks are
 * type-checked.
 */
export type TsdownPluginOption<A = any> = Awaitable<
  | TsdownPlugin<A>
  | RolldownPlugin<A>
  | { name: string }
  | undefined
  | null
  | void
  | false
  | TsdownPluginOption<A>[]
>

export async function flattenPlugins(
  plugins: TsdownPluginOption,
): Promise<TsdownPlugin[]> {
  const awaited = await plugins
  if (!awaited) return []
  if (Array.isArray(awaited)) {
    const nested = await Promise.all(awaited.map(flattenPlugins))
    return nested.flat()
  }
  return [awaited as TsdownPlugin]
}
