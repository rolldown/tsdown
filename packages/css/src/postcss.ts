import { importWithError } from 'tsdown/internal'
import type { PostCSSOptions } from './options.ts'

interface PostCSSConfigResult {
  options: Record<string, any>
  plugins: any[]
}

interface PostCSSProcessResult {
  code: string
  deps: string[]
}

const fileConfigCache = new Map<
  string,
  PostCSSConfigResult | null | Promise<PostCSSConfigResult | null>
>()

async function loadFileConfig(
  searchPath: string,
): Promise<PostCSSConfigResult | null> {
  const cached = fileConfigCache.get(searchPath)
  if (cached !== undefined) return cached

  const promise = (async (): Promise<PostCSSConfigResult | null> => {
    try {
      const postcssrc = (await import('postcss-load-config')).default
      const result = await postcssrc({}, searchPath)
      return {
        options: result.options,
        plugins: result.plugins,
      }
    } catch (error: any) {
      if (error.message?.includes('No PostCSS Config found')) {
        return null
      }
      throw error
    }
  })()

  fileConfigCache.set(searchPath, promise)
  const result = await promise
  fileConfigCache.set(searchPath, result)
  return result
}

function resolvePostCSSConfig(
  postcssOption: PostCSSOptions | undefined,
  cwd: string,
): PostCSSConfigResult | Promise<PostCSSConfigResult | null> {
  if (typeof postcssOption === 'object') {
    const { plugins, ...options } = postcssOption
    return { options, plugins: plugins || [] }
  }

  const searchPath = typeof postcssOption === 'string' ? postcssOption : cwd
  return loadFileConfig(searchPath)
}

export async function processWithPostCSS(
  code: string,
  filename: string,
  postcssOption: PostCSSOptions | undefined,
  cwd: string,
  injectImport?: boolean,
): Promise<PostCSSProcessResult> {
  const config = await resolvePostCSSConfig(postcssOption, cwd)

  const plugins: any[] = []

  if (injectImport) {
    const postcssImport: any = await importWithError('postcss-import')
    plugins.push((postcssImport.default ?? postcssImport)())
  }

  if (config) {
    plugins.push(...config.plugins)
  }

  if (!plugins.length && !config?.options.parser) {
    return { code, deps: [] }
  }

  const postcss = await importWithError<typeof import('postcss')>('postcss')
  const result = await postcss.default(plugins).process(code, {
    ...config?.options,
    from: filename,
    to: filename,
  })

  const deps: string[] = []
  for (const message of result.messages) {
    if (message.type === 'dependency') {
      deps.push(message.file as string)
    } else if (message.type === 'dir-dependency') {
      const { dir } = message
      if (typeof dir === 'string') {
        deps.push(dir)
      }
    }
  }

  return { code: result.css, deps }
}
