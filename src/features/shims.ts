import path from 'node:path'
import type { ResolvedConfig } from '../config/index.ts'
import type { NormalizedFormat } from '../config/types.ts'
import type { Plugin } from 'rolldown'

export const shimFile: string = path.resolve(
  import.meta.dirname,
  import.meta.TSDOWN_PRODUCTION ? '..' : '../..',
  'esm-shims.js',
)

const shimsInject: Record<string, [string, string]> = {
  __dirname: [shimFile, '__dirname'],
  __filename: [shimFile, '__filename'],
}

const shimsDefine: Record<string, string> = {
  __dirname: '__TSDOWN_SHIM_DIRNAME__',
  __filename: '__TSDOWN_SHIM_FILENAME__',
}

const shimsInjectCode = `
import __tsdown_shims_path from 'node:path'
import __tsdown_shims_url from 'node:url'

const __TSDOWN_SHIM_FILENAME__ = /* @__PURE__ */ __tsdown_shims_url.fileURLToPath(import.meta.url)
const __TSDOWN_SHIM_DIRNAME__ = /* @__PURE__ */ __tsdown_shims_path.dirname(__TSDOWN_SHIM_FILENAME__)
`

const cjsImportMetaDefine: Record<string, string> = {
  'import.meta.url': 'require("url").pathToFileURL(__filename).href',
  'import.meta.filename': '__filename',
  'import.meta.dirname': '__dirname',
}

/**
 * Shims are decided in the `options` hook, from the final `platform` after the
 * user's `inputOptions` are merged.
 */
export function ShimsPlugin(
  config: ResolvedConfig,
  format: NormalizedFormat,
): Plugin {
  let banner = false

  return {
    name: 'tsdown:shims',
    options(options) {
      const isNode = options.platform === 'node'
      const transform = (options.transform ||= {})

      // Rolldown only rewrites `import.meta` for CJS on the node platform
      if (format === 'cjs') {
        if (!isNode) {
          transform.define = { ...cjsImportMetaDefine, ...transform.define }
        }
        return
      }

      if (format !== 'es' || !config.shims || !isNode) return
      if (config.unbundle) {
        transform.define = { ...transform.define, ...shimsDefine }
        banner = true
      } else {
        transform.inject = { ...transform.inject, ...shimsInject }
      }
    },
    banner: () => (banner ? shimsInjectCode : ''),
  }
}
