import { readFileSync, writeFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

export function writeJsonFile(filePath: string, content: unknown): void {
  let originalContent: unknown = undefined
  let originalIndent: string | number = 2
  let originalEOL: string = '\n'
  let originalHasTrailingNewline: boolean = false

  try {
    const text = readFileSync(filePath, 'utf8')
    originalContent = JSON.parse(text)
    originalIndent = detectIndentation(text)
    if (text.includes('\r\n')) {
      originalEOL = '\r\n'
    }
    if (text.endsWith('\n')) {
      originalHasTrailingNewline = true
    }
  } catch {
    // File doesn't exist or isn't valid JSON, we'll overwrite it with our content
  }

  if (originalContent && isDeepStrictEqual(originalContent, content)) {
    // The content is the same. We just return without updating the file format
    return
  }

  let jsonString = JSON.stringify(content, null, originalIndent)
  if (originalEOL !== '\n') {
    jsonString = jsonString.replaceAll('\n', originalEOL)
  }
  if (originalHasTrailingNewline) {
    jsonString += originalEOL
  }

  writeFileSync(filePath, jsonString, 'utf8')
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
