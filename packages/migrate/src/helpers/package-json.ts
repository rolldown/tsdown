import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import consola from 'consola'
import { createPatch } from 'diff'
import { detectIndentation } from '../../../../src/utils/json.ts'
import { outputDiff, renameKey } from '../utils.ts'

// Migrated projects are pinned to the last v0.22.x release, which still
// accepts deprecated tsup-compatible options (with warnings). Users should
// resolve all deprecation warnings on this version before upgrading tsdown.
const TSDOWN_VERSION = '^0.22.13'

const DEP_FIELDS = {
  dependencies: TSDOWN_VERSION,
  devDependencies: TSDOWN_VERSION,
  optionalDependencies: TSDOWN_VERSION,
  peerDependencies: '*',
  peerDependenciesMeta: null,
} as const

export async function migratePackageJson(dryRun?: boolean): Promise<boolean> {
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
