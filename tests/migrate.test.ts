import { describe, expect, it } from 'vitest'
import { detectIndentation } from '../src/migrate'

describe('migrate', () => {
  it('detects 2 spaces indentation in package.json', async () => {
    const pkRaw = `{
  "name": "tsdown",
  "version": "0.0.0"
}`
    const indentation = detectIndentation(pkRaw)
    expect(indentation).toBe(2)
  })

  it('detects 4 spaces indentation in package.json', async () => {
    const pkRaw = `{
    "name": "tsdown",
    "version": "0.0.0"
}`
    const indentation = detectIndentation(pkRaw)
    expect(indentation).toBe(4)
  })

  it('detects tab indentation in package.json', async () => {
    const pkRaw = `{\t"name": "tsdown",
\t"version": "0.0.0"
}`
    const indentation = detectIndentation(pkRaw)
    expect(indentation).toBe('\t')
  })

  it('defaults to 2 spaces if no indentation is found', async () => {
    const pkRaw = `{"name": "tsdown", "version": "0.0.0"}`
    const indentation = detectIndentation(pkRaw)
    expect(indentation).toBe(2)
  })
})
