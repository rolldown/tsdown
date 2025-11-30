import path from 'node:path'
import process from 'node:process'
import { createDebug } from 'obug'
import { glob } from 'tinyglobby'
import { slash } from '../utils/general.ts'
import { loadConfigFile } from './file.ts'
import type { InlineConfig, UserConfig } from './types.ts'

const debug = createDebug('tsdown:config:workspace')

const DEFAULT_EXCLUDE_WORKSPACE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/test?(s)/**',
  '**/t?(e)mp/**',
]

export async function resolveWorkspace(
  config: UserConfig,
  inlineConfig: InlineConfig,
): Promise<{ configs: UserConfig[]; files?: string[] }> {
  const normalized = { ...config, ...inlineConfig }
  const rootCwd = normalized.cwd || process.cwd()

  let { workspace } = normalized
  if (!workspace) return { configs: [normalized], files: [] }

  if (workspace === true) {
    workspace = {}
  } else if (typeof workspace === 'string' || Array.isArray(workspace)) {
    workspace = { include: workspace }
  }

  let {
    include: packages = 'auto',
    exclude = DEFAULT_EXCLUDE_WORKSPACE,
    config: workspaceConfig,
  } = workspace
  if (packages === 'auto') {
    packages = (
      await glob('**/package.json', {
        ignore: exclude,
        cwd: rootCwd,
        expandDirectories: false,
      })
    )
      .filter((file) => file !== 'package.json') // exclude root package.json
      .map((file) => slash(path.resolve(rootCwd, file, '..')))
  } else {
    packages = (
      await glob(packages, {
        ignore: exclude,
        cwd: rootCwd,
        onlyDirectories: true,
        absolute: true,
        expandDirectories: false,
      })
    ).map((file) => slash(path.resolve(file)))
  }

  if (packages.length === 0) {
    throw new Error('No workspace packages found, please check your config')
  }

  const files: string[] = []
  const configs = (
    await Promise.all(
      packages.map(async (cwd) => {
        debug('loading workspace config %s', cwd)
        const { configs, file } = await loadConfigFile(
          {
            ...inlineConfig,
            config: workspaceConfig,
            cwd,
          },
          cwd,
        )
        if (file) {
          debug('loaded workspace config file %s', file)
          files.push(file)
        } else {
          debug('no workspace config file found in %s', cwd)
        }
        return configs.map(
          (config): UserConfig => ({ ...normalized, ...config }),
        )
      }),
    )
  ).flat()

  return { configs, files }
}
