import { importWithError } from '../../utils/general.ts'
import { esbuildTargetToLightningCSS } from '../../utils/lightningcss.ts'
import type { LightningCSSOptions } from './index.ts'

export async function transformWithLightningCSS(
  code: string,
  filename: string,
  target: string[] | undefined,
  lightningcssOptions?: LightningCSSOptions,
): Promise<string> {
  const lightningcss =
    await importWithError<typeof import('lightningcss')>('lightningcss')

  const targets =
    lightningcssOptions?.targets ??
    (target ? esbuildTargetToLightningCSS(target) : undefined)
  if (!targets && !lightningcssOptions) return code

  const result = lightningcss.transform({
    filename,
    code: new TextEncoder().encode(code),
    ...lightningcssOptions,
    targets,
  })
  return new TextDecoder().decode(result.code)
}
