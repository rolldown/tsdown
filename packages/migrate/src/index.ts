import process from 'node:process'
import { getCliCommand, parseNi, run } from '@antfu/ni'
import { green, underline } from 'ansis'
import consola from 'consola'
import pkg from '../package.json' with { type: 'json' }
import { migratePackageJson } from './helpers/package-json.ts'
import { migrateTsupConfig } from './helpers/tsup-config.ts'

export interface MigrateOptions {
  cwd?: string
  dryRun?: boolean
}

const DEP_FIELDS = {
  dependencies: `^${pkg.version}`,
  devDependencies: `^${pkg.version}`,
  peerDependencies: '*',
  peerDependenciesMeta: null,
} as const

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

  let migrated = await migratePackageJson(dryRun, DEP_FIELDS)
  if (await migrateTsupConfig(dryRun)) {
    migrated = true
  }
  if (!migrated) {
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
