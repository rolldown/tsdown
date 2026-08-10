import { styleText } from '../../../src/utils/style.ts'

// rename key but keep order
export function renameKey(
  obj: Record<string, any>,
  oldKey: string,
  newKey: string,
  newValue?: any,
): Record<string, any> {
  const newObj: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === oldKey) {
      newObj[newKey] = newValue || value
    } else {
      newObj[key] = value
    }
  }
  return newObj
}

export function outputDiff(text: string): void {
  for (const line of text.split('\n')) {
    const color =
      line[0] === '+'
        ? styleText.green
        : line[0] === '-'
          ? styleText.red
          : styleText.dim
    console.info(color(line))
  }
}
