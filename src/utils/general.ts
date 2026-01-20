import path from 'node:path'
import { pathToFileURL } from 'node:url'
import picomatch from 'picomatch'
import { glob, isDynamicPattern } from 'tinyglobby'

/**
 * Resolve file patterns (strings or globs) to absolute file paths.
 * If patterns contain globs, they will be expanded.
 * Otherwise, paths are resolved relative to cwd.
 *
 * @param patterns - String or array of file patterns/globs
 * @param cwd - Working directory for resolving paths
 * @param globOptions - Optional glob options
 * @param globOptions.onlyFiles - Only return files (default: true)
 * @param globOptions.expandDirectories - Expand directories (default: false)
 * @returns Array of absolute file paths
 */
export async function resolveFilePatterns(
  patterns: string | string[],
  cwd: string,
  globOptions?: { onlyFiles?: boolean; expandDirectories?: boolean },
): Promise<string[]> {
  const patternsArray = toArray(patterns)
  if (!patternsArray.length) return []

  const hasGlob = patternsArray.some((p) => isDynamicPattern(p))

  if (hasGlob) {
    return await glob(patternsArray, {
      cwd,
      onlyFiles: globOptions?.onlyFiles ?? true,
      expandDirectories: globOptions?.expandDirectories ?? false,
      absolute: true,
    })
  }

  // No globs, just resolve paths
  return patternsArray.map((p) => path.resolve(cwd, p))
}

export function toArray<T>(
  val: T | T[] | null | undefined,
  defaultValue?: T,
): T[] {
  if (Array.isArray(val)) {
    return val
  } else if (val == null) {
    if (defaultValue) return [defaultValue]
    return []
  } else {
    return [val]
  }
}

export function resolveComma<T extends string>(arr: T[]): T[] {
  return arr.flatMap((format) => format.split(',') as T[])
}

export function resolveRegex<T>(str: T): T | RegExp {
  if (
    typeof str === 'string' &&
    str.length > 2 &&
    str[0] === '/' &&
    str.at(-1) === '/'
  ) {
    return new RegExp(str.slice(1, -1))
  }
  return str
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
): T {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return function (this: any, ...args: any[]) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = undefined
      fn.apply(this, args)
    }, wait)
  } as T
}

export function slash(string: string): string {
  return string.replaceAll('\\', '/')
}

export const noop = <T>(v: T): T => v

export function matchPattern(
  id: string,
  patterns: (string | RegExp)[],
): boolean {
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      pattern.lastIndex = 0
      return pattern.test(id)
    }
    return id === pattern || picomatch(pattern)(id)
  })
}

export function pkgExists(moduleName: string): boolean {
  try {
    import.meta.resolve(moduleName)
    return true
  } catch {}
  return false
}

export async function importWithError<T>(
  moduleName: string,
  resolvePaths?: string[],
): Promise<T> {
  let resolved: string | undefined
  if (resolvePaths) {
    resolved = pathToFileURL(
      require.resolve(moduleName, { paths: resolvePaths }),
    ).href
  }

  try {
    return (await import(resolved || moduleName)) as T
  } catch (error) {
    const final = new Error(
      `Failed to import module "${moduleName}". Please ensure it is installed.`,
      { cause: error },
    )
    throw final
  }
}

// TODO Promise.withResolvers
export function promiseWithResolvers<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  typeAssert(resolve!)
  return { promise, resolve }
}

export function typeAssert<T>(
  value: T,
): asserts value is Exclude<T, false | null | undefined> {}
