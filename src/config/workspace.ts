import path from 'node:path'
import process from 'node:process'
import { createDebug } from 'obug'
import { glob } from 'tinyglobby'
import { fsExists } from '../utils/fs.ts'
import { slash } from '../utils/general.ts'
import { globalLogger } from '../utils/logger.ts'
import { loadConfigFile } from './file.ts'
import { mergeConfig } from './options.ts'
import type { InlineConfig, UserConfig, UserConfigFnContext } from './types.ts'

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
  context: UserConfigFnContext,
  rootDeps?: Set<string>,
): Promise<{ configs: UserConfig[]; deps: Set<string> }> {
  const normalized = mergeConfig(config, inlineConfig)
  const rootCwd = normalized.cwd || process.cwd()
  const deps = new Set<string>(rootDeps)

  let { workspace } = normalized
  if (!workspace) {
    return {
      configs: [normalized],
      deps,
    }
  }

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
    const matched = (
      await glob(packages, {
        ignore: exclude,
        cwd: rootCwd,
        onlyDirectories: true,
        absolute: true,
        expandDirectories: false,
      })
    ).map((file) => slash(path.resolve(file)))

    // `include` selects directories, so it can select a directory that is not a
    // package — one left behind by a rename, for example. Those entries inherit
    // this config and then fail entry resolution with its name, so only
    // directories that own a manifest join the workspace, as they do under `auto`.
    const probed = await Promise.all(
      matched.map(async (directory) => ({
        directory,
        isPackage: await fsExists(path.join(directory, 'package.json')),
      })),
    )
    packages = probed
      .filter((entry) => entry.isPackage)
      .map((entry) => entry.directory)
    const skipped = probed
      .filter((entry) => !entry.isPackage)
      .map((entry) => slash(path.relative(rootCwd, entry.directory)))
      .toSorted()
    if (skipped.length > 0) {
      globalLogger.warn(
        `workspace include matched ${skipped.length} directories without a package.json; skipping:\n${skipped
          .map((directory) => `  - ${directory}`)
          .join('\n')}`,
      )
    }
  }

  if (packages.length === 0) {
    throw new Error('No workspace packages found, please check your config')
  }

  context = { ...context, rootConfig: normalized }
  const configs = (
    await Promise.all(
      packages.map(async (cwd) => {
        debug('loading workspace config %s', cwd)
        const { configs, deps: workspaceDeps } = await loadConfigFile(
          {
            ...inlineConfig,
            config: workspaceConfig,
            cwd,
          },
          context,
          cwd,
        )
        workspaceDeps?.forEach((dep) => deps.add(dep))
        return configs.map((config) => mergeConfig(normalized, config))
      }),
    )
  ).flat()

  return { configs, deps }
}
