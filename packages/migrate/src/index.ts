import path from 'node:path'
import process from 'node:process'
import { getCliCommand, parseNi, run } from '@antfu/ni'
import { getPackagesSync } from '@manypkg/get-packages'
import { green, greenBright, underline } from 'ansis'
import consola from 'consola'
import { migratePackageJson } from './helpers/package-json.ts'
import { migrateTsupConfig } from './helpers/tsup-config.ts'

export interface MigrateOptions {
  cwd?: string
  dryRun?: boolean
}

export async function migrate({ cwd, dryRun }: MigrateOptions): Promise<void> {
  if (dryRun) {
    consola.info('Dry run enabled. No changes were made.')
  } else {
    const confirm = await consola.prompt(
      `Before proceeding, review the migration guide at ${underline`https://tsdown.dev/guide/migrate-from-tsup`}, as this process will modify your files.\n` +
        `Uncommitted changes will be lost. Use the ${green`--dry-run`} flag to preview changes without applying them.\n\n` +
        'Continue?',
      { type: 'confirm' },
    )
    if (!confirm) {
      consola.warn('Migration cancelled.')
      process.exitCode = 1
      return
    }
  }

  if (cwd) process.chdir(cwd)

  const traverseStartCwd = process.cwd()
  const { rootPackage, packages } = getPackagesSync(traverseStartCwd)
  const cwds = new Set([traverseStartCwd])
  // There are 3 possible cases here:
  // 1. The current directory is a package root without a monorepo configuration.
  //   In this case, `packages` will contain only the current directory. We use a
  //   Set to avoid running it twice.
  // 2. The current directory is not a package root, which means it is an internal
  //   package within a monorepo. In this situation, we assume the user intentionally
  //   specified the migration scope, so we operate only on the current directory.
  // 3. The current directory is a package root and has a monorepo configuration.
  //   In this case, `packages` contains only the discovered subpackage directories,
  //   and we are going to include them.
  if (rootPackage?.dir === traverseStartCwd) {
    for (const { dir } of packages) {
      cwds.add(dir)
    }
  }

  let migratedAny = false

  try {
    for (const dir of cwds) {
      process.chdir(dir)

      const relativeDirLabel = greenBright(
        path.relative(traverseStartCwd, dir) || 'the current directory',
      )
      consola.info(`Processing ${relativeDirLabel}`)

      let migrated = await migratePackageJson(dryRun)
      if (await migrateTsupConfig(dryRun)) {
        migrated = true
      }

      if (!migrated) {
        consola.info(`No migrations to apply in ${relativeDirLabel}.`)
        continue
      }

      migratedAny = true
    }
  } finally {
    process.chdir(traverseStartCwd)
  }

  if (!migratedAny) {
    consola.error('No migration performed.')
    process.exitCode = 1
    return
  }

  consola.info('Migration completed. Installing dependencies...')

  if (dryRun) {
    consola.info('[dry-run] would run:', await getCliCommand(parseNi, []))
  } else {
    await run(parseNi, [], { cwd })
    consola.success('Dependencies installed.')
  }
}
