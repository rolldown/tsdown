import { fs as memFs, vol } from 'memfs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { copy as _copy } from '../features/copy.ts'
import { createLogger } from '../utils/logger.ts'
import type {
  CopyOptions,
  CopyOptionsFn,
  ResolvedConfig,
} from '../config/types.ts'

vi.hoisted(() => {
  vi.resetModules()
})

vi.mock('node:fs', () => ({ ...memFs, default: memFs }))
vi.mock('node:fs/promises', () => memFs.promises)

function copy(options: CopyOptions | CopyOptionsFn) {
  return _copy({
    cwd: '/cwd',
    outDir: '/cwd/dist',
    copy: options,
    logger: {
      ...createLogger(),
      info() {},
      warn: (...args: any[]) => {
        throw new Error(args.join(' '))
        return
      },
    },
  } as ResolvedConfig)
}

function getFiles() {
  return vol.toJSON('/cwd', {}, true)
}

beforeEach(() => {
  vol.reset()
})

describe('copy', () => {
  test('basic', async () => {
    vol.fromJSON({
      '/cwd/src/file.txt': 'file content',
      '/cwd/src/image.png': 'image content',
      '/cwd/src/nested/deep.txt': 'deep content',
    })
    await copy('**/*')
    expect(getFiles()).toEqual({
      'src/file.txt': 'file content',
      'dist/file.txt': 'file content',

      'src/image.png': 'image content',
      'dist/image.png': 'image content',

      'src/nested/deep.txt': 'deep content',
      'dist/deep.txt': 'deep content',
    })
  })

  test('with ignore', async () => {
    vol.fromJSON({
      '/cwd/src/file.txt': 'file content',
      '/cwd/src/image.png': 'image content',
      '/cwd/src/nested/deep.txt': 'deep content',
    })
    await copy({ from: ['**/*', '!**/*.png'] })
    expect(getFiles()).toEqual({
      'src/file.txt': 'file content',
      'dist/file.txt': 'file content',
      'src/nested/deep.txt': 'deep content',
      'dist/deep.txt': 'deep content',

      'src/image.png': 'image content',
    })
  })

  test('copy to specific folder', async () => {
    vol.fromJSON({
      '/cwd/src/file.txt': 'file content',
    })
    await copy({ from: '**/*', to: 'assets' })
    expect(getFiles()).toEqual({
      'src/file.txt': 'file content',
      'assets/file.txt': 'file content',
    })
  })

  test('copy directory', async () => {
    vol.fromJSON({
      '/cwd/src/assets/image.png': 'image content',
      '/cwd/src/assets/styles/main.css': 'body {}',
    })
    await copy({ from: 'src/assets', to: 'dist/public', flatten: false })
    expect(getFiles()).toEqual({
      'src/assets/image.png': 'image content',
      'dist/public/assets/image.png': 'image content',

      'src/assets/styles/main.css': 'body {}',
      'dist/public/assets/styles/main.css': 'body {}',
    })
  })

  test('copy with file renaming', async () => {
    vol.fromJSON({
      '/cwd/src/file.txt': 'file content',
    })
    await copy([
      {
        from: 'src/file.txt',
        to: 'dist',
        rename: 'file.md',
      },
      {
        from: 'src/file.txt',
        to: 'dist',
        rename: (name, extension) => `${name}-renamed.${extension}.suffix`,
      },
    ])
    expect(getFiles()).toEqual({
      'src/file.txt': 'file content',
      'dist/file.md': 'file content',
      'dist/file-renamed.txt.suffix': 'file content',
    })
  })

  test('flatten', async () => {
    vol.fromJSON({
      '/cwd/assets/fonts/arial.woff': '',
      '/cwd/assets/fonts/arial.woff2': '',
    })
    await copy({
      from: ['assets/fonts/arial.woff', 'assets/fonts/arial.woff2'],
      to: 'dist/public/fonts',
    })
    expect(Object.keys(getFiles()).toSorted()).toEqual(
      [
        'assets/fonts/arial.woff',
        'dist/public/fonts/arial.woff',

        'assets/fonts/arial.woff2',
        'dist/public/fonts/arial.woff2',
      ].toSorted(),
    )
  })
})
