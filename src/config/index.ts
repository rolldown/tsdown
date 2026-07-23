import path from 'node:path'
import { createDebug } from 'obug'
import { createConcurrencyExecutor } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import { loadConfigFile } from './file.ts'
import { resolveUserConfig } from './options.ts'
import { resolveWorkspace } from './workspace.ts'
import type { InlineConfig, ResolvedConfig } from './types.ts'

export * from './types.ts'

const debug = createDebug('tsdown:config')

// InlineConfig (CLI)
//  -> loadConfigFile: InlineConfig + UserConfig[]
//  -> resolveWorkspace: InlineConfig (applied) + UserConfig[]
//  -> resolveUserConfig: ResolvedConfig[]
//  -> build

// resolved configs count = 1 (inline config) * root config count * workspace count * sub config count

export async function resolveConfig(inlineConfig: InlineConfig): Promise<{
  configs: ResolvedConfig[]
  deps: Set<string>
}> {
  debug('inline config %O', inlineConfig)

  if (inlineConfig.cwd) {
    inlineConfig.cwd = path.resolve(inlineConfig.cwd)
  }

  const { configs: rootConfigs, deps: rootDeps } =
    await loadConfigFile(inlineConfig)
  const globalDeps = new Set<string>(rootDeps)
  const runBuild = createConcurrencyExecutor(inlineConfig.concurrency)

  const configs: ResolvedConfig[] = (
    await Promise.all(
      rootConfigs.map(async (rootConfig): Promise<ResolvedConfig[]> => {
        const { configs: workspaceConfigs, deps: workspaceDeps } =
          await resolveWorkspace(rootConfig, inlineConfig, rootDeps)
        debug('workspace configs %O', workspaceConfigs)

        const configs = (
          await Promise.all(
            workspaceConfigs
              .filter((config) => !config.workspace || config.entry)
              .map((config) =>
                resolveUserConfig(
                  config,
                  inlineConfig,
                  workspaceDeps,
                  runBuild,
                ),
              ),
          )
        )
          .flat()
          .filter((config) => !!config)

        workspaceDeps.forEach((dep) => globalDeps.add(dep))
        return configs
      }),
    )
  ).flat()
  debug('resolved configs %O', configs)

  if (configs.length === 0) {
    throw new Error('No valid configuration found.')
  }
  if (
    inlineConfig.concurrency != null &&
    configs.some((config) => config.watch)
  ) {
    globalLogger.warn(
      '`--concurrency` is not supported in watch mode and will be ignored.',
    )
  }

  return { configs, deps: globalDeps }
}
