import { existsSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { getCliCommand, parseNi, run } from '@antfu/ni'
import { dim, green, red, underline } from 'ansis'
import consola from 'consola'
import { createPatch, createTwoFilesPatch } from 'diff'
import { detectIndentation } from '../../../src/utils/format.ts'
import pkg from '../package.json' with { type: 'json' }

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

  let migrated = await migratePackageJson(dryRun)
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

const DEP_FIELDS = {
  dependencies: `^${pkg.version}`,
  devDependencies: `^${pkg.version}`,
  peerDependencies: '*',
  peerDependenciesMeta: null,
} as const
async function migratePackageJson(dryRun?: boolean): Promise<boolean> {
  if (!existsSync('package.json')) {
    consola.error('No package.json found')
    return false
  }

  const pkgRaw = await readFile('package.json', 'utf8')
  let pkg = JSON.parse(pkgRaw)
  let found = false

  for (const [field, semver] of Object.entries(DEP_FIELDS)) {
    if (pkg[field]?.tsup) {
      consola.info(`Migrating \`${field}\` to tsdown.`)
      found = true
      pkg[field] = renameKey(pkg[field], 'tsup', 'tsdown', semver)
    }
  }

  if (pkg.scripts) {
    for (const key of Object.keys(pkg.scripts)) {
      if (pkg.scripts[key].includes('tsup')) {
        consola.info(`Migrating \`${key}\` script to tsdown`)
        found = true
        pkg.scripts[key] = pkg.scripts[key].replaceAll(
          /tsup(?:-node)?/g,
          'tsdown',
        )
      }
    }
  }
  if (pkg.tsup) {
    consola.info('Migrating `tsup` field in package.json to `tsdown`.')
    found = true
    pkg = renameKey(pkg, 'tsup', 'tsdown')
  }

  if (!found) {
    consola.warn('No tsup-related fields found in package.json')
    return false
  }

  const eol = pkgRaw.endsWith('\n') ? '\n' : ''
  const newPkgRaw = `${JSON.stringify(pkg, null, detectIndentation(pkgRaw))}${eol}`
  if (dryRun) {
    consola.info('[dry-run] package.json:')
    outputDiff(createPatch('package.json', pkgRaw, newPkgRaw))
  } else {
    await writeFile('package.json', newPkgRaw)
    consola.success('Migrated `package.json`')
  }
  return true
}

const TSUP_FILES = [
  'tsup.config.ts',
  'tsup.config.cts',
  'tsup.config.mts',
  'tsup.config.js',
  'tsup.config.cjs',
  'tsup.config.mjs',
  'tsup.config.json',
]
async function migrateTsupConfig(dryRun?: boolean): Promise<boolean> {
  let found = false

  for (const file of TSUP_FILES) {
    if (!existsSync(file)) continue
    consola.info(`Found \`${file}\``)
    found = true

    const tsupConfigRaw = await readFile(file, 'utf8')
    const tsupConfig = tsupConfigRaw
      .replaceAll(/\btsup\b/g, 'tsdown')
      .replaceAll(/\bTSUP\b/g, 'TSDOWN')

    const renamed = file.replaceAll('tsup', 'tsdown')
    if (dryRun) {
      consola.info(`[dry-run] ${file} -> ${renamed}:`)
      const diff = createTwoFilesPatch(file, renamed, tsupConfigRaw, tsupConfig)
      outputDiff(diff)
    } else {
      await writeFile(renamed, tsupConfig, 'utf8')
      await unlink(file)
      consola.success(`Migrated \`${file}\` to \`${renamed}\``)
    }
  }

  if (!found) {
    consola.warn('No tsup config found')
  }

  return found
}

// rename key but keep order
function renameKey(
  obj: Record<string, any>,
  oldKey: string,
  newKey: string,
  newValue?: any,
) {
  const newObj: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    if (key === oldKey) {
      newObj[newKey] = newValue || obj[oldKey]
    } else {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

function outputDiff(text: string) {
  for (const line of text.split('\n')) {
    const color = line[0] === '+' ? green : line[0] === '-' ? red : dim
    console.info(color(line))
  }
}
