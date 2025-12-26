import process from 'node:process'
import { Hookable } from 'hookable'
import { exec } from 'tinyexec'
import treeKill from 'tree-kill'
import type { ResolvedConfig, RolldownChunk } from '../config/index.ts'
import type { BuildOptions } from 'rolldown'

export interface BuildContext {
  options: ResolvedConfig
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
  'build:done': (
    ctx: BuildContext & { chunks: RolldownChunk[] },
  ) => void | Promise<void>
}

export async function createHooks(options: ResolvedConfig): Promise<{
  hooks: Hookable<TsdownHooks>
  context: BuildContext
}> {
  const hooks = new Hookable<TsdownHooks>()
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

export function executeOnSuccess(
  config: ResolvedConfig,
): AbortController | undefined {
  if (!config.onSuccess) return

  const ab = new AbortController()
  if (typeof config.onSuccess === 'string') {
    const p = exec(config.onSuccess, [], {
      nodeOptions: {
        shell: true,
        stdio: 'inherit',
      },
    })
    p.then(({ exitCode }) => {
      if (exitCode) {
        process.exitCode = exitCode
      }
    })
    ab.signal.addEventListener('abort', () => {
      if (typeof p.pid === 'number') {
        treeKill(p.pid)
      }
    })
  } else {
    config.onSuccess(config, ab.signal)
  }

  return ab
}
