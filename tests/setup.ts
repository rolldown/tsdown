import { beforeEach } from 'vitest'
import { fsRemove } from '../src/utils/fs.ts'
import { getTestDir } from './utils.ts'

beforeEach(async (context) => {
  const dir = getTestDir(context.task)
  await fsRemove(dir)
})
