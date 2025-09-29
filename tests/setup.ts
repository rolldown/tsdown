import { beforeEach } from 'vitest'
import { fsRemove } from '../src/utils/fs'
import { getTestDir } from './utils'

beforeEach(async (context) => {
  const dir = getTestDir(context.task)
  await fsRemove(dir)
})
