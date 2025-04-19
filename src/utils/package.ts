import { readFile } from 'node:fs/promises'
import { findUp } from 'find-up-simple'
import { debug } from '../utils/logger'
import type { NormalizedFormat } from '../options'
import { toArray } from './general'
import type { PackageJson } from 'pkg-types'
import type { ModuleFormat } from 'rolldown'

export async function readPackageJson(
  dir: string,
): Promise<PackageJson | undefined> {
  const packageJsonPath = await findUp('package.json', { cwd: dir })
  if (!packageJsonPath) return
  debug('Reading package.json:', packageJsonPath)
  const contents = await readFile(packageJsonPath, 'utf8')
  return JSON.parse(contents) as PackageJson
}

export type PackageType = 'module' | 'commonjs' | undefined
export function getPackageType(pkg: PackageJson | undefined): PackageType {
  if (pkg?.type) {
    if (!['module', 'commonjs'].includes(pkg.type)) {
      throw new Error(`Invalid package.json type: ${pkg.type}`)
    }
    return pkg.type
  }
}

export function normalizeFormat(
  format: ModuleFormat | ModuleFormat[],
): NormalizedFormat[] {
  return toArray<ModuleFormat>(format, 'es').map((format): NormalizedFormat => {
    switch (format) {
      case 'es':
      case 'esm':
      case 'module':
        return 'es'
      case 'cjs':
      case 'commonjs':
        return 'cjs'
      default:
        return format
    }
  })
}
