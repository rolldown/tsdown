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

export async function importWithError<T>(moduleName: string): Promise<T> {
  try {
    return (await import(moduleName)) as T
  } catch (error) {
    const final = new Error(
      `Failed to import module "${moduleName}". Please ensure it is installed.`,
      { cause: error },
    )
    throw final
  }
}

export type ConcurrencyExecutor = <T>(task: () => Promise<T>) => Promise<T>

export function createConcurrencyExecutor(
  concurrency?: number,
): ConcurrencyExecutor {
  if (concurrency == null) {
    return (task) => task()
  }
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new TypeError('`--concurrency` must be a positive integer')
  }

  const queue: Array<() => void> = []
  let active = 0

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve))
    } else {
      active++
    }

    try {
      return await task()
    } finally {
      const next = queue.shift()
      if (next) {
        next()
      } else {
        active--
      }
    }
  }
}

export function typeAssert<T>(
  // eslint-disable-next-line unused-imports/no-unused-vars
  value: T,
): asserts value is Exclude<T, false | null | undefined> {}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}
