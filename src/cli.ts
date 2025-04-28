import process from 'node:process'
import { dim } from 'ansis'
import { cac } from 'cac'
import debug from 'debug'
import { VERSION as rolldownVersion } from 'rolldown'
import { version } from '../package.json'
import { resolveComma, toArray } from './utils/general'
import { logger, setSilent } from './utils/logger'
import type { Options } from './options'

const cli = cac('tsdown')
cli.help().version(version)

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
  .option('--external <module>', 'Mark dependencies as external')
  .option('--minify', 'Minify output')
  .option('--debug [scope]', 'Show debug logs')
  .option('--target <target>', 'Bundle target, e.g "es2015", "esnext"')
  .option('--silent', 'Suppress non-error logs')
  .option('-d, --out-dir <dir>', 'Output directory', { default: 'dist' })
  .option('--treeshake', 'Tree-shake bundle', { default: true })
  .option('--sourcemap', 'Generate source map', { default: false })
  .option('--shims', 'Enable cjs and esm shims ', { default: false })
  .option('--platform <platform>', 'Target platform', {
    default: 'node',
  })
  .option('--dts', 'Generate dts files')
  .option('--publint', 'Enable publint', { default: false })
  .option('--unused', 'Enable unused dependencies check', { default: false })
  .option('-w, --watch [path]', 'Watch mode')
  .option('--from-vite [vitest]', 'Reuse config from Vite or Vitest')
  .option('--report', 'Size report', { default: true })
  .option('--env.* <value>', 'Define compile-time env variables')
  .action(async (input: string[], flags: Options) => {
    setSilent(!!flags.silent)
    logger.info(
      `tsdown ${dim`v${version}`} powered by rolldown ${dim`v${rolldownVersion}`}`,
    )
    const { build } = await import('./index')
    if (input.length > 0) flags.entry = input
    await build(flags)
  })

cli
  .command('migrate', 'Migrate from tsup to tsdown')
  .option('-c, --cwd <dir>', 'Working directory')
  .option('-d, --dry-run', 'Dry run')
  .action(async (args) => {
    const { migrate } = await import('./migrate')
    await migrate(args)
  })

export async function runCLI(): Promise<void> {
  cli.parse(process.argv, { run: false })

  if (cli.options.debug) {
    let namespace: string
    if (cli.options.debug === true) {
      namespace = 'tsdown:*'
    } else {
      // support debugging multiple flags with comma-separated list
      namespace = resolveComma(toArray(cli.options.debug))
        .map((v) => `tsdown:${v}`)
        .join(',')
    }

    const enabled = debug.disable()
    if (enabled) namespace += `,${enabled}`

    debug.enable(namespace)
    debug('tsdown:debug')('Debugging enabled', namespace)
  }

  try {
    await cli.runMatchedCommand()
  } catch (error) {
    logger.fatal(error)
    process.exit(1)
  }
}
