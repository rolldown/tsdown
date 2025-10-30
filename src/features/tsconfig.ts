import path from 'node:path'
import { blue } from 'ansis'
import { up as findUp } from 'empathic/find'
import { fsStat } from '../utils/fs.ts'
import { generateColor, prettyName, type Logger } from '../utils/logger.ts'
import type { Options } from '../options/index.ts'

export function findTsconfig(
  cwd?: string,
  name: string = 'tsconfig.json',
): string | false {
  return findUp(name, { cwd }) || false
}

export async function resolveTsconfig(
  logger: Logger,
  tsconfig: Options['tsconfig'],
  cwd: string,
  name?: string,
): Promise<string | false> {
  const original = tsconfig

  if (tsconfig !== false) {
    if (tsconfig === true || tsconfig == null) {
      tsconfig = findTsconfig(cwd)
      if (original && !tsconfig) {
        logger.warn(`No tsconfig found in ${blue(cwd)}`)
      }
    } else {
      const tsconfigPath = path.resolve(cwd, tsconfig)
      const stat = await fsStat(tsconfigPath)
      if (stat?.isFile()) {
        tsconfig = tsconfigPath
      } else if (stat?.isDirectory()) {
        tsconfig = findTsconfig(tsconfigPath)
        if (!tsconfig) {
          logger.warn(`No tsconfig found in ${blue(tsconfigPath)}`)
        }
      } else {
        tsconfig = findTsconfig(cwd, tsconfig)
        if (!tsconfig) {
          logger.warn(`tsconfig ${blue(original)} doesn't exist`)
        }
      }
    }

    if (tsconfig) {
      logger.info(
        prettyName(name),
        `tsconfig: ${generateColor(name)(path.relative(cwd, tsconfig))}`,
      )
    }
  }

  return tsconfig
}
