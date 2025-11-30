import { createDebug } from 'obug'
import { loadConfigFile } from './file.ts'
import { resolveUserConfig } from './options.ts'
import { resolveWorkspace } from './workspace.ts'
import type { InlineConfig, ResolvedConfig } from './types.ts'

export * from './types.ts'

const debug = createDebug('tsdown:config')

// InlineConfig (CLI)
//  -> loadConfigFile: InlineConfig + UserConfig[]
//  -> resolveWorkspace: InlineConfig + UserConfig[]
//  -> UserConfig[]
//  -> ResolvedConfig[]
//  -> build

// resolved configs count = 1 (inline config) * root config count * workspace count * sub config count

export async function resolveConfig(inlineConfig: InlineConfig): Promise<{
  configs: ResolvedConfig[]
  files: string[]
}> {
  debug('inline config %O', inlineConfig)

  const { configs: rootConfigs, file } = await loadConfigFile(inlineConfig)
  const files: string[] = []
  if (file) {
    files.push(file)
    debug('loaded root user config file %s', file)
    debug('root user configs %O', rootConfigs)
  } else {
    debug('no root user config file found')
  }

  const configs: ResolvedConfig[] = (
    await Promise.all(
      rootConfigs.map(async (rootConfig): Promise<ResolvedConfig[]> => {
        const { configs: workspaceConfigs, files: workspaceFiles } =
          await resolveWorkspace(rootConfig, inlineConfig)
        if (workspaceFiles) {
          files.push(...workspaceFiles)
        }
        return (
          await Promise.all(
            workspaceConfigs
              .filter((config) => !config.workspace || config.entry)
              .map((config) => resolveUserConfig(config, inlineConfig)),
          )
        ).filter((config) => !!config)
      }),
    )
  ).flat()
  debug('resolved configs %O', configs)

  if (configs.length === 0) {
    throw new Error('No valid configuration found.')
  }

  return { configs, files }
}
