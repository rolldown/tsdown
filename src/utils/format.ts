export function formatBytes(bytes: number): string | undefined {
  if (bytes === Infinity) return undefined
  if (bytes > 1000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`
  }
  return `${(bytes / 1000).toFixed(2)} kB`
}
