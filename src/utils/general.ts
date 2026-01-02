import { pathToFileURL } from 'node:url'
import picomatch from 'picomatch'

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
