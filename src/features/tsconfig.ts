import path from 'node:path'
import { up as findUp } from 'empathic/find'
import { fsStat } from '../utils/fs.ts'
import { styleText, type StyleText } from '../utils/style.ts'
import type { UserConfig } from '../config/index.ts'
import type { Logger } from '../utils/logger.ts'

function findTsconfig(
  cwd?: string,
  name: string = 'tsconfig.json',
): string | false {
  return findUp(name, { cwd }) || false
}

export async function resolveTsconfig(
  logger: Logger,
  tsconfig: UserConfig['tsconfig'],
  cwd: string,
  color: StyleText,
  nameLabel?: string,
): Promise<string | false> {
  const original = tsconfig

  if (tsconfig !== false) {
    if (tsconfig === true || tsconfig == null) {
      tsconfig = findTsconfig(cwd)
      if (original && !tsconfig) {
        logger.warn(`No tsconfig found in ${styleText.blue(cwd)}`)
      }
    } else {
      const tsconfigPath = path.resolve(cwd, tsconfig)
      const stat = await fsStat(tsconfigPath)
      if (stat?.isFile()) {
        tsconfig = tsconfigPath
      } else if (stat?.isDirectory()) {
        tsconfig = findTsconfig(tsconfigPath)
        if (!tsconfig) {
          logger.warn(`No tsconfig found in ${styleText.blue(tsconfigPath)}`)
        }
      } else {
        tsconfig = findTsconfig(cwd, tsconfig)
        if (!tsconfig) {
          logger.warn(
            `tsconfig ${styleText.blue(original as string)} doesn't exist`,
          )
        }
      }
    }

    if (tsconfig) {
      logger.info(nameLabel, `tsconfig: ${color(path.relative(cwd, tsconfig))}`)
    }
  }

  return tsconfig
}
