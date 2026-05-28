import path from 'node:path'
import type { NormalizedFormat, ResolvedConfig } from '../config/index.ts'
import type { Plugin } from 'rolldown'

export const shimFile: string = path.resolve(
  import.meta.dirname,
  import.meta.TSDOWN_PRODUCTION ? '..' : '../..',
  'esm-shims.js',
)

export const shimsDefine = {
  __dirname: '__TSDOWN_SHIM_DIRNAME__',
  __filename: '__TSDOWN_SHIM_FILENAME__',
}

const shimsInjectCode = `
import __tsdown_shims_path from 'node:path'
import __tsdown_shims_url from 'node:url'

const __TSDOWN_SHIM_FILENAME__ = /* @__PURE__ */ __tsdown_shims_url.fileURLToPath(import.meta.url)
const __TSDOWN_SHIM_DIRNAME__ = /* @__PURE__ */ __tsdown_shims_path.dirname(__TSDOWN_SHIM_FILENAME__)
`

export const shimsPlugin: Plugin = {
  name: 'tsdown:shims-banner',
  banner: shimsInjectCode,
}

export function getShimsInject(
  format: NormalizedFormat,
  platform: ResolvedConfig['platform'],
): Record<string, [string, string]> | undefined {
  if (format === 'es' && platform === 'node') {
    return {
      __dirname: [shimFile, '__dirname'],
      __filename: [shimFile, '__filename'],
    }
  }
}
