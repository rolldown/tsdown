import { readFile } from 'node:fs/promises'
import { up as findPackage } from 'empathic/package'
import Debug from 'obug'
import type { Format, NormalizedFormat } from '../config/index.ts'
import { resolveComma, toArray } from './general.ts'
import type { PackageJson } from 'pkg-types'

const debug = Debug('tsdown:package')

export async function readPackageJson(
  dir: string,
): Promise<PackageJson | undefined> {
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

export function normalizeFormat(format: Format | Format[]): NormalizedFormat[] {
  return resolveComma(toArray<Format>(format, 'es')).map(
    (format): NormalizedFormat => {
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
    },
  )
}
