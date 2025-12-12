import { dim, green, red } from 'ansis'

// rename key but keep order
export function renameKey(
  obj: Record<string, any>,
  oldKey: string,
  newKey: string,
  newValue?: any,
): Record<string, any> {
  const newObj: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    if (key === oldKey) {
      newObj[newKey] = newValue || obj[oldKey]
    } else {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

export function outputDiff(text: string): void {
  for (const line of text.split('\n')) {
    const color = line[0] === '+' ? green : line[0] === '-' ? red : dim
    console.info(color(line))
  }
}
