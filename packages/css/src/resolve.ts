import path from 'node:path'
import { ResolverFactory } from 'rolldown/experimental'

let cssResolver: ResolverFactory | undefined
let sassResolver: ResolverFactory | undefined

export function getCssResolver(): ResolverFactory {
  return (cssResolver ??= new ResolverFactory({
    conditionNames: ['style', 'default'],
  }))
}

export function getSassResolver(): ResolverFactory {
  return (sassResolver ??= new ResolverFactory({
    conditionNames: ['sass', 'style', 'default'],
    mainFields: ['sass', 'style', 'main'],
    extensions: ['.scss', '.sass', '.css'],
  }))
}

export function resolveWithResolver(
  resolver: ResolverFactory,
  specifier: string,
  from: string,
): string | undefined {
  const dir = path.dirname(from)
  const result = resolver.sync(dir, specifier)
  if (result.error || !result.path) {
    return
  }
  return result.path
}
