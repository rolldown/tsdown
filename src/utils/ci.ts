import process from 'node:process'

export function isInCI(): boolean {
  const ci = process.env.CI
  return ci != null && ci !== '0' && ci.toLowerCase() !== 'false'
}
