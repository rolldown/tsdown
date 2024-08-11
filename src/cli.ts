import process from 'node:process'
import { cac } from 'cac'
import { version } from '../package.json'
import { logger } from './utils/logger'
import type { Options } from './options'

export async function runCLI(): Promise<void> {
  const cli = cac('tsdown')

  cli
    .command('[...files]', 'Bundle files', {
      ignoreOptionDefaultValue: true,
    })
    .option('-c, --config <filename>', 'Use a custom config file')
    .option('--no-config', 'Disable config file')
    .option('--format <format>', 'Bundle format: esm, cjs, iife', {
      default: 'esm',
    })
    .option('--clean', 'Clean output directory')
    .option('--minify', 'Minify output')
    .option('-d, --out-dir <dir>', 'Output directory', { default: 'dist' })
    .option('--treeshake', 'Tree-shake bundle', { default: true })
    .option('--sourcemap', 'Generate source map', { default: false })
    .option('--platform <platform>', 'Target platform', {
      default: 'node',
    })
    .option('--watch', 'Watch mode')
    .action(async (input: string[], flags: Options) => {
      logger.info(`tsdown v${version}`)
      const { build } = await import('./index')
      if (input.length > 0) flags.entry = input
      await build(flags)
    })

  cli.help()
  cli.version(version)
  cli.parse(process.argv, { run: false })

  try {
    await cli.runMatchedCommand()
  } catch (error) {
    logger.fatal(error)
    process.exit(1)
  }
}
