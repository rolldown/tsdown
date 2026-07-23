import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { writeFixtures } from '../../../tests/utils.ts'
import {
  compilePreprocessor,
  disposeSassCompiler,
  loadSassCompiler,
  type SassCompiler,
  type SassModule,
} from './preprocessors.ts'

function createCompileResult(): { css: string; loadedUrls: URL[] } {
  return { css: '', loadedUrls: [] }
}

describe('loadSassCompiler', () => {
  afterEach(async () => {
    await disposeSassCompiler()
  })

  test('reuses async compiler when supported', async () => {
    const compiler: SassCompiler = {
      compileStringAsync: vi.fn(() => Promise.resolve(createCompileResult())),
      dispose: vi.fn(),
    }
    const sass: SassModule = {
      compileStringAsync: vi.fn(() => Promise.resolve(createCompileResult())),
      initAsyncCompiler: vi.fn(() => Promise.resolve(compiler)),
    }

    const [firstCompiler, secondCompiler] = await Promise.all([
      loadSassCompiler(sass),
      loadSassCompiler(sass),
    ])

    expect(firstCompiler).toBe(compiler)
    expect(secondCompiler).toBe(compiler)
    expect(sass.initAsyncCompiler).toHaveBeenCalledOnce()

    await disposeSassCompiler()

    expect(compiler.dispose).toHaveBeenCalledOnce()
  })

  test('falls back to module compiler when async compiler is unavailable', async () => {
    const sass: SassModule = {
      compileStringAsync: vi.fn(() => Promise.resolve(createCompileResult())),
    }

    await expect(loadSassCompiler(sass)).resolves.toBe(sass)
  })
})

describe('compilePreprocessor', () => {
  test('does not rebase URL-like functions prefixed by astral Unicode', async (context) => {
    const { testDir } = await writeFixtures(context, {
      'main.scss': `@use '@my-lib/styles/functions';`,
      'node_modules/@my-lib/styles/functions.scss': `
        .icon {
          background: 😀url("./asset.png");
          source: 😀data-uri("./asset.svg");
        }
      `,
      'node_modules/@my-lib/styles/package.json':
        '{"name":"@my-lib/styles","main":"index.js"}',
    })

    const result = await compilePreprocessor(
      'scss',
      `@use '@my-lib/styles/functions';`,
      path.join(testDir, 'main.scss'),
    )

    expect(result.code).toContain('😀url("./asset.png")')
    expect(result.code).toContain('😀data-uri("./asset.svg")')
  })
})
