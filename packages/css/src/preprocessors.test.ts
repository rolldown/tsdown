import { afterEach, describe, expect, test, vi } from 'vitest'
import {
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
