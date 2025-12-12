import { esbuildTargetToLightningCSS } from '../utils/lightningcss.ts'
import type { ResolvedConfig } from '../config/index.ts'
import type { Plugin } from 'rolldown'

export async function LightningCSSPlugin(
  options: Pick<ResolvedConfig, 'target'>,
): Promise<Plugin | undefined> {
  const LightningCSS = await import('unplugin-lightningcss/rolldown').catch(
    () => undefined,
  )
  if (!LightningCSS) return

  // Converts the user-provided esbuild-format target into a LightningCSS
  // targets object.
  const targets = options.target && esbuildTargetToLightningCSS(options.target)
  if (!targets) return

  return LightningCSS.default({ options: { targets } })
}
