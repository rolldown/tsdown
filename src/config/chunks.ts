import type { InternalModuleFormat, OutputAsset, OutputChunk } from 'rolldown'

export type RolldownChunks = OutputChunk | OutputAsset
export type TsdownChunks = Partial<
  Record<InternalModuleFormat, RolldownChunks[]>
>
export interface TsdownBundle extends AsyncDisposable {
  chunks: TsdownChunks
}
