import { readFile } from 'node:fs/promises'
import { up as findPackage } from 'empathic/package'
import { createDebug } from 'obug'
import type { Format, NormalizedFormat } from '../config/index.ts'
import type { PackageJson } from 'pkg-types'

const debug = createDebug('tsdown:package')

export interface PackageJsonWithPath extends PackageJson {
  packageJsonPath: string
}

export async function readPackageJson(
  dir: string,
): Promise<PackageJsonWithPath | undefined> {
  const packageJsonPath = findPackage({ cwd: dir })
  if (!packageJsonPath) return
  debug('Reading package.json:', packageJsonPath)
  const contents = await readFile(packageJsonPath, 'utf8')
  return {
    ...JSON.parse(contents),
    packageJsonPath,
  }
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

export function normalizeFormat(format: Format): NormalizedFormat {
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
}
