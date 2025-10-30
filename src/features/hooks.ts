import { createHooks as create, type Hookable } from 'hookable'
import type { ResolvedOptions } from '../options/index.ts'
import type { BuildOptions } from 'rolldown'

export interface BuildContext {
  options: ResolvedOptions
  hooks: Hookable<TsdownHooks>
}

export interface RolldownContext {
  buildOptions: BuildOptions
}

/**
 * Hooks for tsdown.
 */
export interface TsdownHooks {
  /**
   * Invoked before each tsdown build starts.
   * Use this hook to perform setup or preparation tasks.
   */
  'build:prepare': (ctx: BuildContext) => void | Promise<void>
  /**
   * Invoked before each Rolldown build.
   * For dual-format builds, this hook is called for each format.
   * Useful for configuring or modifying the build context before bundling.
   */
  'build:before': (ctx: BuildContext & RolldownContext) => void | Promise<void>
  /**
   * Invoked after each tsdown build completes.
   * Use this hook for cleanup or post-processing tasks.
   */
  'build:done': (ctx: BuildContext) => void | Promise<void>
}

export async function createHooks(options: ResolvedOptions): Promise<{
  hooks: Hookable<TsdownHooks>
  context: BuildContext
}> {
  const hooks = create<TsdownHooks>()
  if (typeof options.hooks === 'object') {
    hooks.addHooks(options.hooks)
  } else if (typeof options.hooks === 'function') {
    await options.hooks(hooks)
  }
  const context: BuildContext = {
    options,
    hooks,
  }
  return { hooks, context }
}
