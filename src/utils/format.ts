export function formatBytes(bytes: number): string | undefined {
  if (bytes === Infinity) return undefined
  return `${(bytes / 1000).toFixed(2)} kB`
}

export function detectIndentation(jsonText: string): string | number {
  const lines = jsonText.split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(/^(\s+)\S/)
    if (!match) continue

    if (match[1].includes('\t')) {
      return '\t'
    }
    return match[1].length
  }

  return 2
}
