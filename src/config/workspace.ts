import path from 'node:path'
import process from 'node:process'
import { createDebug } from 'obug'
import { glob } from 'tinyglobby'
import { fsExists } from '../utils/fs.ts'
import { slash } from '../utils/general.ts'
import { configExtensions, configPrefix, loadConfigFile } from './file.ts'
import { mergeConfig } from './options.ts'
import type { InlineConfig, UserConfig, UserConfigFnContext } from './types.ts'

const debug = createDebug('tsdown:config:workspace')

const DEFAULT_EXCLUDE_WORKSPACE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/test?(s)/**',
  '**/t?(e)mp/**',
]

const PACKAGE_MARKERS = [
  'package.json',
  ...configExtensions.map((ext) => `${configPrefix}.${ext}`),
]

/** A directory is only a workspace package if it holds a package.json or a tsdown config. */
async function isPackageDirectory(dir: string): Promise<boolean> {
  const found = await Promise.all(
    PACKAGE_MARKERS.map((marker) => fsExists(path.resolve(dir, marker))),
  )
  return found.includes(true)
}

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
  let skipped = 0
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

    // An explicit config path names the config, so package-ness is not the signal.
    if (typeof workspaceConfig !== 'string') {
      const isPackage = await Promise.all(packages.map(isPackageDirectory))
      const matched = packages.length
      packages = packages.filter((dir, index) => {
        if (!isPackage[index]) {
          debug(
            'skipping directory without package.json or tsdown config %s',
            dir,
          )
        }
        return isPackage[index]
      })
      skipped = matched - packages.length
    }
  }

  if (packages.length === 0) {
    const detail = skipped
      ? ` (${skipped} matched ${skipped === 1 ? 'directory contains' : 'directories contain'} no package.json or tsdown config)`
      : ''
    throw new Error(
      `No workspace packages found, please check your config${detail}`,
    )
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
