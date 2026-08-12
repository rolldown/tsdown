import process from 'node:process'
import {
  AGENTS,
  detect,
  getCliCommand,
  parseNi,
  run,
  type ExtendedResolvedCommand,
} from '@antfu/ni'
import consola from 'consola'
import { glob } from 'tinyglobby'
import { styleText } from '../../../src/utils/style.ts'
import { migratePackageJson } from './helpers/package-json.ts'
import { migrateTsupConfig } from './helpers/tsup-config.ts'

export type PackageManager = (typeof AGENTS)[number]

export interface MigrateOptions {
  dirs?: string[]
  dryRun?: boolean
  install?: boolean
  packageManager?: PackageManager
  yes?: boolean
}

function isPackageManager(value: string): value is PackageManager {
  return AGENTS.includes(value as PackageManager)
}

async function resolveInstallCommand(
  cwd: string,
  packageManager: PackageManager | undefined,
  interactive: boolean,
): Promise<ExtendedResolvedCommand> {
  const agent = packageManager ?? (await detect({ cwd, programmatic: true }))

  if (agent) {
    const command = await parseNi(agent, [], {
      cwd,
      hasLock: true,
      programmatic: true,
    })
    if (!command) {
      throw new Error(
        `Unable to resolve an install command for package manager "${agent}".`,
      )
    }
    return command
  }

  if (interactive) {
    const command = await getCliCommand(parseNi, [], { cwd })
    if (command) return command
    throw new Error('Package manager selection cancelled.')
  }

  throw new Error(
    'Unable to detect a package manager in a non-interactive environment. ' +
      'Add a packageManager field or lockfile, pass --package-manager <name>, or use --no-install.',
  )
}

export async function migrate({
  dirs,
  dryRun,
  install = true,
  packageManager,
  yes,
}: MigrateOptions): Promise<void> {
  if (packageManager && !isPackageManager(packageManager)) {
    throw new Error(
      `Unsupported package manager "${packageManager}". Expected one of: ${AGENTS.join(', ')}.`,
    )
  }

  const interactive = process.stdin.isTTY && process.stdout.isTTY

  if (dryRun) {
    consola.info('Dry run enabled. No changes were made.')
  } else if (!yes) {
    if (!interactive) {
      throw new Error(
        'Non-interactive migration requires explicit confirmation. Re-run with --yes.',
      )
    }

    const confirm = await consola.prompt(
      `Before proceeding, review the migration guide at ${styleText.underline(`https://tsdown.dev/guide/migrate-from-tsup`)}, as this process will modify your files.\n` +
        `Uncommitted changes will be lost. Use the ${styleText.green(`--dry-run`)} flag to preview changes without applying them.\n\n` +
        'Continue?',
      { type: 'confirm' },
    )
    if (!confirm) {
      consola.warn('Migration cancelled.')
      process.exitCode = 1
      return
    }
  }

  const baseCwd = process.cwd()
  let cwds: string[]
  if (dirs?.length) {
    cwds = await glob(dirs, {
      cwd: baseCwd,
      onlyDirectories: true,
      absolute: true,
      expandDirectories: false,
    })
    if (cwds.length === 0) {
      consola.error(`No directories matched: ${dirs.join(', ')}`)
      process.exitCode = 1
      return
    }
  } else {
    cwds = [baseCwd]
  }

  const installCommand = install
    ? await resolveInstallCommand(baseCwd, packageManager, interactive)
    : undefined
  let migratedAny = false

  try {
    for (const dir of cwds) {
      process.chdir(dir)

      const dirLabel = styleText.greenBright(dir)
      consola.info(`Processing ${dirLabel}`)

      let migrated = await migratePackageJson(dryRun)
      if (await migrateTsupConfig(dryRun)) {
        migrated = true
      }

      if (!migrated) {
        consola.warn(`No migrations to apply in ${dirLabel}.`)
        continue
      }

      migratedAny = true
    }
  } finally {
    process.chdir(baseCwd)
  }

  if (!migratedAny) {
    consola.error('No migration performed.')
    process.exitCode = 1
    return
  }

  if (installCommand) {
    consola.info('Migration completed. Installing dependencies...')

    if (dryRun) {
      consola.info('[dry-run] would run:', installCommand)
    } else {
      await run(
        () => ({ ...installCommand, args: [...installCommand.args] }),
        [],
        { cwd: baseCwd, programmatic: true },
      )
      consola.success('Dependencies installed.')
    }
  } else {
    consola.info('Migration completed. Dependency installation skipped.')
  }

  consola.box(
    `Your project now uses tsdown v0.22, the last version that accepts deprecated tsup-compatible options.\n` +
      `Run your build, resolve all deprecation warnings, then upgrade tsdown to the latest version.`,
  )
}
