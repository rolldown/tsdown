import { describe, expect, test } from 'vitest'
import { compilePreprocessor, getPreprocessorLang } from './preprocessors.ts'
import { PREPROCESSOR_LANG_SOURCE } from './utils.ts'

describe('preprocessors', () => {
  test('detects preprocessor lang from vue style query', () => {
    for (const lang of PREPROCESSOR_LANG_SOURCE.split('|')) {
      expect(
        getPreprocessorLang(`/src/App.vue?vue&type=style&index=0&lang.${lang}`),
      ).toBe(lang)
    }
  })

  test('normalizes preprocessor filenames for virtual style ids', async () => {
    expect(
      (
        await compilePreprocessor(
          'scss',
          '',
          '/src/App.vue?vue&type=style&index=0&lang.scss',
        )
      ).filename,
    ).toBe('/src/App.scss')

    expect(
      (await compilePreprocessor('scss', '', '/src/theme.scss')).filename,
    ).toBe('/src/theme.scss')

    expect(
      (
        await compilePreprocessor(
          'scss',
          '',
          'virtual:style?vue&type=style&index=0&lang.scss',
        )
      ).filename,
    ).toBe('virtual:style.scss')
  })
})
