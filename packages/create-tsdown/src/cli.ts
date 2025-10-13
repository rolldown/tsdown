import process from 'node:process'
import { log } from '@clack/prompts'
import { cac } from 'cac'
import { version } from '../package.json'
import { create, type Options } from './index'

const cli = cac('create-tsdown')
cli.help().version(version)

cli
  .command('[path]', 'Create a tsdown project', {
    ignoreOptionDefaultValue: true,
    allowUnknownOptions: true,
  })
  .option(
    '-t, --template <template>',
    'Available templates: default, minimal, vue, react, solid',
    { default: 'default' },
  )
  .action((path: string | undefined, options: Options) => create(path, options))

export async function runCLI(): Promise<void> {
  cli.parse(process.argv, { run: false })

  try {
    await cli.runMatchedCommand()
  } catch (error) {
    log.error(String(error))
    process.exit(1)
  }
}
