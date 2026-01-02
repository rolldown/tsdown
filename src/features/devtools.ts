import { importWithError } from '../utils/general.ts'
import type { StartOptions } from '@vitejs/devtools/cli-commands'
import type { InputOptions } from 'rolldown'

export interface DevtoolsOptions extends NonNullable<InputOptions['devtools']> {
  /**
   * **[experimental]** Enable devtools integration. `@vitejs/devtools` must be installed as a dependency.
   *
   * Defaults to true, if `@vitejs/devtools` is installed.
   */
  ui?: boolean | Partial<StartOptions>

  /**
   * Clean devtools stale sessions.
   *
   * @default true
   */
  clean?: boolean
}

export async function startDevtoolsUI(config: DevtoolsOptions): Promise<void> {
  const { start } = await importWithError<
    typeof import('@vitejs/devtools/cli-commands')
  >('@vitejs/devtools/cli-commands')
  await start({
    host: '127.0.0.1',
    open: true,
    ...(typeof config.ui === 'object' ? config.ui : {}),
  })
}
