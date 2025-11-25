import process from 'node:process'
import { cac } from 'cac'
import consola from 'consola'
import pkg from '../package.json' with { type: 'json' }
import { migrate, type MigrateOptions } from './index.ts'

const cli = cac(pkg.name).version(pkg.version).help()

cli
  .command('', 'Migrate a project to tsdown')
  .option(
    '-c, --cwd <path>',
    'Current working directory to run the migration in',
  )
  .option('-d, --dry-run', 'Perform a dry run without making changes')
  .action((options: MigrateOptions) => migrate(options))

export async function runCLI(): Promise<void> {
  cli.parse(process.argv, { run: false })

  try {
    await cli.runMatchedCommand()
  } catch (error) {
    consola.error(error)
    process.exit(1)
  }
}
