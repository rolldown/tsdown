import { existsSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { bold, green, underline } from 'ansis'
import { version } from '../package.json'
import { globalLogger } from './utils/logger'

export async function migrate({
  cwd,
  dryRun,
}: {
  cwd?: string
  dryRun?: boolean
}): Promise<void> {
  if (dryRun) {
    globalLogger.info('Dry run enabled. No changes were made.')
  } else {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    globalLogger.warn(
      `\n\n` +
        `Before proceeding, review the migration guide at ${underline`https://tsdown.dev/guide/migrate-from-tsup`}, as this process will modify your files.\n` +
        `Uncommitted changes will be lost. Use the ${green`--dry-run`} flag to preview changes without applying them.`,
    )
    const input = await rl.question(bold`Continue? (Y/n) `)
    rl.close()

    const confirm = input.toLowerCase() === 'y' || input === ''
    if (!confirm) {
      globalLogger.error('Migration cancelled.')
      process.exitCode = 1
      return
    }
  }

  if (cwd) process.chdir(cwd)

  let migrated = await migratePackageJson(dryRun)
  if (await migrateTsupConfig(dryRun)) {
    migrated = true
  }
  if (migrated) {
    globalLogger.success(
      'Migration completed. Remember to run install command with your package manager.',
    )
  } else {
    globalLogger.error('No migration performed.')
    process.exitCode = 1
  }
}

async function migratePackageJson(dryRun?: boolean): Promise<boolean> {
  if (!existsSync('package.json')) {
    globalLogger.error('No package.json found')
    return false
  }

  const pkgRaw = await readFile('package.json', 'utf-8')
  let pkg = JSON.parse(pkgRaw)
  const semver = `^${version}`
  let found = false
  if (pkg.dependencies?.tsup) {
    globalLogger.info('Migrating `dependencies` to tsdown.')
    found = true
    pkg.dependencies = renameKey(pkg.dependencies, 'tsup', 'tsdown', semver)
  }
  if (pkg.devDependencies?.tsup) {
    globalLogger.info('Migrating `devDependencies` to tsdown.')
    found = true
    pkg.devDependencies = renameKey(
      pkg.devDependencies,
      'tsup',
      'tsdown',
      semver,
    )
  }
  if (pkg.peerDependencies?.tsup) {
    globalLogger.info('Migrating `peerDependencies` to tsdown.')
    found = true
    pkg.peerDependencies = renameKey(
      pkg.peerDependencies,
      'tsup',
      'tsdown',
      '*',
    )
  }
  if (pkg.scripts) {
    for (const key of Object.keys(pkg.scripts)) {
      if (pkg.scripts[key].includes('tsup')) {
        globalLogger.info(`Migrating \`${key}\` script to tsdown`)
        found = true
        pkg.scripts[key] = pkg.scripts[key].replaceAll(
          /tsup(?:-node)?/g,
          'tsdown',
        )
      }
    }
  }
  if (pkg.tsup) {
    globalLogger.info('Migrating `tsup` field in package.json to `tsdown`.')
    found = true
    pkg = renameKey(pkg, 'tsup', 'tsdown')
  }

  if (!found) {
    globalLogger.warn('No tsup-related fields found in package.json')
    return false
  }

  const pkgStr = `${JSON.stringify(pkg, null, 2)}\n`
  if (dryRun) {
    const { createPatch } = await import('diff')
    globalLogger.info('[dry-run] package.json:')
    console.info(createPatch('package.json', pkgRaw, pkgStr))
  } else {
    await writeFile('package.json', pkgStr)
    globalLogger.success('Migrated `package.json`')
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
    globalLogger.info(`Found \`${file}\``)
    found = true

    const tsupConfigRaw = await readFile(file, 'utf-8')
    const tsupConfig = tsupConfigRaw
      .replaceAll(/\btsup\b/g, 'tsdown')
      .replaceAll(/\bTSUP\b/g, 'TSDOWN')

    const renamed = file.replaceAll('tsup', 'tsdown')
    if (dryRun) {
      const { createTwoFilesPatch } = await import('diff')
      globalLogger.info(`[dry-run] ${file} -> ${renamed}:`)
      console.info(
        createTwoFilesPatch(file, renamed, tsupConfigRaw, tsupConfig),
      )
    } else {
      await writeFile(renamed, tsupConfig, 'utf8')
      await unlink(file)
      globalLogger.success(`Migrated \`${file}\` to \`${renamed}\``)
    }
  }

  if (!found) {
    globalLogger.warn('No tsup config found')
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
