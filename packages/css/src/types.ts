export interface MinimalLogger {
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
}
