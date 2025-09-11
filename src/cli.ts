import process from 'node:process'
import { dim } from 'ansis'
import { cac } from 'cac'
import debug from 'debug'
import { VERSION as rolldownVersion } from 'rolldown'
import { version } from '../package.json'
import { resolveComma, toArray } from './utils/general'
import { globalLogger } from './utils/logger'
import type { Options } from './options'

const cli = cac('tsdown')
cli.help().version(version)

cli
  .command('[...files]', 'Bundle files', {
    ignoreOptionDefaultValue: true,
    allowUnknownOptions: true,
  })
  .option('-c, --config <filename>', 'Use a custom config file')
  .option(
    '--config-loader <loader>',
    'Config loader to use: auto, native, unconfig',
    { default: 'auto' },
  )
  .option('--no-config', 'Disable config file')
  .option('-f, --format <format>', 'Bundle format: esm, cjs, iife, umd', {
    default: 'esm',
  })
  .option('--clean', 'Clean output directory, --no-clean to disable')
  .option('--external <module>', 'Mark dependencies as external')
  .option('--minify', 'Minify output')
  .option('--debug [feat]', 'Show debug logs')
  .option('--target <target>', 'Bundle target, e.g "es2015", "esnext"')
  .option('-l, --logLevel <level>', 'Set log level: info, warn, error, silent')
  .option('--fail-on-warn', 'Fail on warnings', { default: true })
  .option('-d, --out-dir <dir>', 'Output directory', { default: 'dist' })
  .option('--treeshake', 'Tree-shake bundle', { default: true })
  .option('--sourcemap', 'Generate source map', { default: false })
  .option('--shims', 'Enable cjs and esm shims ', { default: false })
  .option('--platform <platform>', 'Target platform', {
    default: 'node',
  })
  .option('--dts', 'Generate dts files')
  .option('--publint', 'Enable publint', { default: false })
  .option('--attw', 'Enable Are the types wrong integration', {
    default: false,
  })
  .option('--unused', 'Enable unused dependencies check', { default: false })
  .option('-w, --watch [path]', 'Watch mode')
  .option('--ignore-watch <path>', 'Ignore custom paths in watch mode')
  .option('--from-vite [vitest]', 'Reuse config from Vite or Vitest')
  .option('--report', 'Size report', { default: true })
  .option('--env.* <value>', 'Define compile-time env variables')
  .option('--on-success <command>', 'Command to run on success')
  .option('--copy <dir>', 'Copy files to output dir')
  .option('--public-dir <dir>', 'Alias for --copy, deprecated')
  .option('--tsconfig <tsconfig>', 'Set tsconfig path')
  .option('--unbundle', 'Unbundle mode')
  .option('-W, --workspace [dir]', 'Enable workspace mode')
  .option(
    '-F, --filter <pattern>',
    'Filter workspace packages, e.g. /regex/ or substring',
  )
  .option(
    '--exports',
    'Generate export-related metadata for package.json (experimental)',
  )
  .action(async (input: string[], flags: Options) => {
    globalLogger.level = flags.logLevel || (flags.silent ? 'silent' : 'info')
    globalLogger.info(
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
    globalLogger.error(error)
    process.exit(1)
  }
}
