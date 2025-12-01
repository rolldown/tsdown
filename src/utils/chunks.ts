import type { NormalizedFormat, ResolvedConfig } from '../config/types.ts'
import type { OutputAsset, OutputChunk } from 'rolldown'

export type RolldownChunk = (OutputChunk | OutputAsset) & { outDir: string }
export type ChunksByFormat = Partial<Record<NormalizedFormat, RolldownChunk[]>>
export interface TsdownBundle extends AsyncDisposable {
  chunks: RolldownChunk[]
  config: ResolvedConfig
}

export function addOutDirToChunks(
  chunks: Array<OutputChunk | OutputAsset>,
  outDir: string,
): RolldownChunk[] {
  return chunks.map((chunk) => {
    // @ts-expect-error missing property
    chunk.outDir = outDir
    return chunk as RolldownChunk
  })
}
