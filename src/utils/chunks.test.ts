import { describe, expect, test } from 'vitest'
import { addOutDirToChunks } from './chunks.ts'
import type { OutputAsset, OutputChunk } from 'rolldown'

describe('addOutDirToChunks', () => {
  test('adds outDir to each chunk', () => {
    const chunks: Array<OutputChunk | OutputAsset> = [
      // @ts-expect-error partial mock
      { type: 'chunk', fileName: 'index.js', code: '' },
      // @ts-expect-error partial mock
      { type: 'asset', fileName: 'style.css', source: '' },
    ]
    const result = addOutDirToChunks(chunks, '/dist')
    expect(result).toHaveLength(2)
    expect(result[0].outDir).toBe('/dist')
    expect(result[1].outDir).toBe('/dist')
  })

  test('returns empty array for empty input', () => {
    const result = addOutDirToChunks([], '/dist')
    expect(result).toEqual([])
  })

  test('preserves original chunk properties', () => {
    const chunks: OutputChunk[] = [
      // @ts-expect-error partial mock
      {
        type: 'chunk',
        fileName: 'index.js',
        code: 'console.log("hello")',
        isEntry: true,
      },
    ]
    const result = addOutDirToChunks(chunks, '/out')
    expect(result[0].type).toBe('chunk')
    expect(result[0].fileName).toBe('index.js')
    expect(result[0].outDir).toBe('/out')
  })
})
