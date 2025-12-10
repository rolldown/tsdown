import { chmod } from 'node:fs/promises'
import path from 'node:path'
import { underline } from 'ansis'
import { fsExists } from '../utils/fs.ts'
import { prettyFormat, type Logger } from '../utils/logger.ts'
import type { Plugin } from 'rolldown'

const RE_SHEBANG = /^#!.*/

export function ShebangPlugin(
  logger: Logger,
  cwd: string,
  nameLabel?: string,
  isDualFormat?: boolean,
): Plugin {
  return {
    name: 'tsdown:shebang',
    async writeBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue
        if (!RE_SHEBANG.test(chunk.code)) continue

        const filepath = path.resolve(
          cwd,
          options.file || path.join(options.dir!, chunk.fileName),
        )
        if (await fsExists(filepath)) {
          logger.info(
            nameLabel,
            isDualFormat && prettyFormat(options.format),
            `Granting execute permission to ${underline(path.relative(cwd, filepath))}`,
          )
          await chmod(filepath, 0o755)
        }
      }
    },
  }
}
