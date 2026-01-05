import process from 'node:process'
import { getCliCommand, parseNi, run } from '@antfu/ni'
import { green, greenBright, underline } from 'ansis'
import consola from 'consola'
import { glob } from 'tinyglobby'
import { migratePackageJson } from './helpers/package-json.ts'
import { migrateTsupConfig } from './helpers/tsup-config.ts'

export interface MigrateOptions {
  dirs?: string[]
  dryRun?: boolean
}

export async function migrate({ dirs, dryRun }: MigrateOptions): Promise<void> {
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

  let migratedAny = false

  try {
    for (const dir of cwds) {
      process.chdir(dir)

      const dirLabel = greenBright(dir)
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

  consola.info('Migration completed. Installing dependencies...')

  if (dryRun) {
    consola.info('[dry-run] would run:', await getCliCommand(parseNi, []))
  } else {
    await run(parseNi, [], { cwd: baseCwd })
    consola.success('Dependencies installed.')
  }
}
