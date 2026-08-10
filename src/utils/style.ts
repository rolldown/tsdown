import process from 'node:process'
import {
  styleText as nodeStyleText,
  type InspectColor,
  type StyleTextOptions,
} from 'node:util'

let supportRGB = !!process.stdout.hasColors?.(2 ** 24)
if (supportRGB) {
  try {
    nodeStyleText('#000', '')
  } catch {
    supportRGB = false
  }
}

// MIT License
// https://github.com/fisker/node-style-text
const factory = (...formats: InspectColor[]) =>
  new Proxy(nodeStyleText.bind(undefined, formats), {
    get: (_, format: InspectColor) => {
      if (format[0] === '#') {
        const [color, fallback] = format.split(',', 2)
        if (!supportRGB) {
          return fallback
            ? factory(...formats, fallback as InspectColor)
            : factory(...formats)
        }
        return factory(...formats, color as InspectColor)
      }
      return factory(...formats, format)
    },
  })

type Formats = InspectColor | `#${string}`
export type StyleText = {
  (text: string, options?: StyleTextOptions): string
} & { [key in Formats]: StyleText }

export const styleText = factory() as StyleText
