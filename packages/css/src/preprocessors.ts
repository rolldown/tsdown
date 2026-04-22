import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getSassResolver, resolveWithResolver } from './resolve.ts'
import { CSS_LANGS_RE } from './utils.ts'
import type { PreprocessorOptions } from './options.ts'

export type PreprocessorLang = keyof PreprocessorOptions

const PREPROCESSOR_LANGS: Record<string, PreprocessorLang> = {
  sass: 'sass',
  less: 'less',
  scss: 'scss',
  styl: 'styl',
  stylus: 'stylus',
}

export interface PreprocessResult {
  code: string
  deps: string[]
}

export function getPreprocessorLang(
  filename: string,
): PreprocessorLang | undefined {
  const ext = path.extname(filename).slice(1)
  return PREPROCESSOR_LANGS[ext]
}

export function getPreprocessorLangFromId(
  id: string,
): PreprocessorLang | undefined {
  const match = CSS_LANGS_RE.exec(id)
  if (!match) return
  return PREPROCESSOR_LANGS[match[1]]
}

export function compilePreprocessor(
  lang: PreprocessorLang,
  code: string,
  filename: string,
  options?: PreprocessorOptions,
): Promise<PreprocessResult> {
  switch (lang) {
    case 'scss':
    case 'sass':
      return compileSass(lang, code, filename, options)
    case 'less':
      return compileLess(code, filename, options)
    case 'styl':
    case 'stylus':
      return compileStylus(code, filename, options)
  }
}

// #region URL rebasing

// Regexes adapted from Vite
const cssUrlRE: RegExp =
  /(?<!@import\s+)(?<=^|[^\w\-\u0080-\uFFFF])url\((\s*('[^']+'|"[^"]+")\s*|(?:\\.|[^'")\\])+)\)/
const cssDataUriRE: RegExp =
  /(?<=^|[^\w\-\u0080-\uFFFF])data-uri\((\s*('[^']+'|"[^"]+")\s*|[^'")]+)\)/
const importCssRE: RegExp =
  /@import\s+(?:url\()?('[^']+\.css'|"[^"]+\.css"|[^'"\s)]+\.css)/

type CssUrlReplacer = (
  unquotedUrl: string,
  rawUrl: string,
) => string | false | Promise<string | false>

async function rebaseUrls(
  file: string,
  rootFile: string,
  ignoreUrl?: (unquotedUrl: string, rawUrl: string) => boolean,
): Promise<{ file: string; contents?: string }> {
  file = path.resolve(file)
  const fileDir = path.dirname(file)
  const rootDir = path.dirname(rootFile)
  if (fileDir === rootDir) {
    return { file }
  }

  const content = await readFile(file, 'utf8')
  const hasUrls = cssUrlRE.test(content)
  const hasDataUris = cssDataUriRE.test(content)
  const hasImportCss = importCssRE.test(content)

  if (!hasUrls && !hasDataUris && !hasImportCss) {
    return { file }
  }

  let rebased: string | undefined
  const rebaseFn: CssUrlReplacer = (unquotedUrl: string, rawUrl: string) => {
    if (ignoreUrl?.(unquotedUrl, rawUrl)) return false
    if (unquotedUrl[0] === '/') return unquotedUrl
    const absolute = path.resolve(fileDir, unquotedUrl)
    const relative = path.relative(rootDir, absolute)
    return normalizePath(relative)
  }

  if (hasImportCss) {
    rebased = await rewriteImportCss(content, rebaseFn)
  }
  if (hasUrls) {
    rebased = await rewriteCssUrls(rebased || content, rebaseFn)
  }
  if (hasDataUris) {
    rebased = await rewriteCssDataUris(rebased || content, rebaseFn)
  }

  return { file, contents: rebased }
}

async function asyncReplace(
  input: string,
  re: RegExp,
  replacer: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
  let match: RegExpExecArray | null
  let remaining = input
  let rewritten = ''

  while ((match = re.exec(remaining))) {
    rewritten += remaining.slice(0, match.index)
    rewritten += await replacer(match)
    remaining = remaining.slice(match.index + match[0].length)
  }
  rewritten += remaining
  return rewritten
}

function rewriteCssUrls(
  css: string,
  replacer: CssUrlReplacer,
): Promise<string> {
  return asyncReplace(css, cssUrlRE, async (match) => {
    const [matched, rawUrl] = match
    return await doUrlReplace(rawUrl.trim(), matched, replacer)
  })
}

function rewriteCssDataUris(
  css: string,
  replacer: CssUrlReplacer,
): Promise<string> {
  return asyncReplace(css, cssDataUriRE, async (match) => {
    const [matched, rawUrl] = match
    return await doUrlReplace(rawUrl.trim(), matched, replacer, 'data-uri')
  })
}

function rewriteImportCss(
  css: string,
  replacer: CssUrlReplacer,
): Promise<string> {
  return asyncReplace(css, importCssRE, async (match) => {
    const [matched, rawUrl] = match
    return await doImportCSSReplace(rawUrl, matched, replacer)
  })
}

const externalRE: RegExp = /^(?:[a-z]+:)?\/\//
const dataUrlRE: RegExp = /^\s*data:/i

function skipUrlReplacer(unquotedUrl: string): boolean {
  return (
    externalRE.test(unquotedUrl) ||
    dataUrlRE.test(unquotedUrl) ||
    unquotedUrl[0] === '#'
  )
}

async function doUrlReplace(
  rawUrl: string,
  matched: string,
  replacer: CssUrlReplacer,
  funcName: string = 'url',
): Promise<string> {
  let wrap = ''
  const first = rawUrl[0]
  if (first === `"` || first === `'`) {
    wrap = first
    rawUrl = rawUrl.slice(1, -1)
  }

  if (skipUrlReplacer(rawUrl)) {
    return matched
  }

  const newUrl = await replacer(rawUrl, matched)
  if (typeof newUrl === 'string') {
    if (wrap === '' && newUrl !== encodeURI(newUrl)) {
      wrap = '"'
    }
    return `${funcName}(${wrap}${newUrl}${wrap})`
  }
  return matched
}

async function doImportCSSReplace(
  rawUrl: string,
  matched: string,
  replacer: CssUrlReplacer,
): Promise<string> {
  let wrap = ''
  const first = rawUrl[0]
  if (first === `"` || first === `'`) {
    wrap = first
    rawUrl = rawUrl.slice(1, -1)
  }

  const newUrl = await replacer(rawUrl, matched)
  if (typeof newUrl === 'string') {
    return matched.replace(`${wrap}${rawUrl}${wrap}`, `${wrap}${newUrl}${wrap}`)
  }
  return matched
}

function normalizePath(id: string): string {
  return id.replaceAll('\\', '/')
}

// #endregion

// #region additionalData

type PreprocessorAdditionalData = NonNullable<
  NonNullable<PreprocessorOptions['scss']>['additionalData']
>

async function getSource(
  source: string,
  filename: string,
  additionalData: PreprocessorAdditionalData | undefined,
  sep: string = '',
): Promise<string> {
  if (!additionalData) return source

  if (typeof additionalData === 'function') {
    const newContent = await additionalData(source, filename)
    if (typeof newContent === 'string') {
      return newContent
    }
    return newContent.content
  }

  return additionalData + sep + source
}

// #endregion

// #region Sass

async function compileSass(
  lang: 'scss' | 'sass',
  code: string,
  filename: string,
  options?: PreprocessorOptions,
): Promise<PreprocessResult> {
  const sass = await loadSass()
  const preprocessorOpts = options?.scss ?? options?.sass ?? {}

  const data = await getSource(code, filename, preprocessorOpts.additionalData)

  const { additionalData: _, ...sassOptions } = preprocessorOpts

  const skipRebaseUrls = (unquotedUrl: string, rawUrl: string) => {
    const isQuoted = rawUrl[0] === '"' || rawUrl[0] === "'"
    if (!isQuoted && unquotedUrl[0] === '$') return true
    return unquotedUrl.startsWith('#{')
  }

  const internalImporter: any = {
    async canonicalize(url: string, context: any) {
      const importer = context.containingUrl
        ? fileURLToPath(context.containingUrl)
        : filename

      const resolved = await tryResolveScss(url, importer)
      if (resolved) {
        return pathToFileURL(resolved)
      }
      return null
    },
    async load(canonicalUrl: URL) {
      const ext = path.extname(canonicalUrl.pathname)
      let syntax: string = 'scss'
      if (ext === '.sass') {
        syntax = 'indented'
      } else if (ext === '.css') {
        syntax = 'css'
      }
      const filePath = fileURLToPath(canonicalUrl)
      const result = await rebaseUrls(filePath, filename, skipRebaseUrls)
      const contents = result.contents ?? (await readFile(result.file, 'utf8'))
      return { contents, syntax, sourceMapUrl: canonicalUrl }
    },
  }

  const result = await sass.compileStringAsync(data, {
    url: pathToFileURL(filename),
    sourceMap: false,
    syntax: lang === 'sass' ? 'indented' : 'scss',
    ...sassOptions,
    importers: [internalImporter, ...(sassOptions.importers ?? [])],
  })

  return {
    code: result.css,
    deps: result.loadedUrls
      .filter((url: URL) => url.protocol === 'file:')
      .map((url: URL) => fileURLToPath(url)),
  }
}

async function tryResolveScss(
  url: string,
  importer: string,
): Promise<string | undefined> {
  const dir = path.dirname(importer)
  const { existsSync } = await import('node:fs')
  const extensions = ['.scss', '.sass', '.css']
  const prefixes = ['', '_']

  if (extensions.some((ext) => url.endsWith(ext))) {
    for (const prefix of prefixes) {
      const file = path.resolve(
        dir,
        path.dirname(url),
        prefix + path.basename(url),
      )
      if (existsSync(file)) return file
    }
  } else {
    for (const ext of extensions) {
      for (const prefix of prefixes) {
        const file = path.resolve(
          dir,
          path.dirname(url),
          prefix + path.basename(url) + ext,
        )
        if (existsSync(file)) return file
      }
    }

    for (const ext of extensions) {
      for (const prefix of prefixes) {
        const file = path.resolve(dir, url, `${prefix}index${ext}`)
        if (existsSync(file)) return file
      }
    }
  }

  // Fall back to node_modules resolution
  return resolveWithResolver(getSassResolver(), url, importer)
}

let _sass: any
async function loadSass() {
  if (_sass) return _sass
  try {
    // @ts-ignore -- optional peer dependency
    _sass = await import('sass-embedded')
    return _sass
  } catch {
    try {
      // @ts-ignore -- optional peer dependency
      _sass = await import('sass')
      return _sass
    } catch {
      throw new Error(
        'Preprocessor dependency "sass" not found. Did you install it? Try `npm install -D sass`.',
      )
    }
  }
}

// #endregion

// #region Less

async function compileLess(
  code: string,
  filename: string,
  options?: PreprocessorOptions,
): Promise<PreprocessResult> {
  const less = await loadLess()
  const preprocessorOpts = options?.less ?? {}

  const data = await getSource(code, filename, preprocessorOpts.additionalData)

  const { additionalData: _, plugins = [], ...lessOptions } = preprocessorOpts

  const result = await less.render(data, {
    paths: ['node_modules'],
    ...lessOptions,
    filename,
    plugins,
  })

  return {
    code: result.css,
    deps: result.imports || [],
  }
}

let _less: any
async function loadLess() {
  if (_less) return _less
  try {
    // @ts-ignore -- optional peer dependency
    _less = (await import('less')).default
    return _less
  } catch {
    throw new Error(
      'Preprocessor dependency "less" not found. Did you install it? Try `npm install -D less`.',
    )
  }
}

// #endregion

// #region Stylus

async function compileStylus(
  code: string,
  filename: string,
  options?: PreprocessorOptions,
): Promise<PreprocessResult> {
  const stylus = await loadStylus()
  const preprocessorOpts = options?.styl ?? options?.stylus ?? {}

  const data = await getSource(
    code,
    filename,
    preprocessorOpts.additionalData,
    '\n',
  )

  const { additionalData: _, define, ...stylusOptions } = preprocessorOpts

  const ref = stylus(data, {
    paths: ['node_modules'],
    ...stylusOptions,
    filename,
  })

  if (define) {
    for (const key of Object.keys(define)) {
      ref.define(key, define[key])
    }
  }

  return new Promise((resolve, reject) => {
    ref.render((err: any, css: string) => {
      if (err) {
        reject(new Error(`[stylus] ${err.message}`))
      } else {
        resolve({
          code: css,
          deps: ref.deps(),
        })
      }
    })
  })
}

let _stylus: any
async function loadStylus() {
  if (_stylus) return _stylus
  try {
    // @ts-ignore -- optional peer dependency
    _stylus = (await import('stylus')).default
    return _stylus
  } catch {
    throw new Error(
      'Preprocessor dependency "stylus" not found. Did you install it? Try `npm install -D stylus`.',
    )
  }
}

// #endregion
