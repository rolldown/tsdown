import { describe, expect, test } from 'vitest'
import { testBuild } from './utils.ts'

const animationCss = `
  :root { --fade-animation: fade-out 2s ease-in-out }
  .fade { animation: var(--fade-animation) }
  @keyframes fade-out {
    from { opacity: 1 }
    to { opacity: 0 }
  }
`

describe('lightningcss css modules options', () => {
  test.for([
    { extension: 'css', minify: false },
    { extension: 'css', minify: true },
    { extension: 'scss', minify: false },
    { extension: 'scss', minify: true },
  ])(
    'preserves animation names with $extension and minify=$minify',
    async ({ extension, minify }, context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './global.css'\nexport { default as styles } from './app.module.${extension}'`,
          [`app.module.${extension}`]: animationCss,
          'global.css': '.global { color: red }',
        },
        options: {
          css: {
            minify,
            lightningcss: {
              cssModules: { animation: false, pattern: 'scoped_[local]' },
            },
          },
        },
      })

      const css = fileMap['style.css']
      expect(css).toContain('@keyframes fade-out')
      expect(css).toMatch(/--fade-animation:\s*fade-out 2s ease-in-out/)
      expect(css).toContain('var(--fade-animation)')
      expect(css).toContain('.scoped_fade')
      expect(css).toContain('.global')
      expect(css).not.toContain('scoped_global')
      expect(css).not.toContain('scoped_scoped_')
      expect(fileMap['index.mjs']).toContain('"scoped_fade"')
    },
  )

  test.for([
    {
      modules: { generateScopedName: 'custom_[local]' },
      className: 'custom_fade',
    },
    { modules: { scopeBehaviour: 'global' as const }, className: 'fade' },
  ])(
    'prefers tsdown modules options for $className',
    async ({ modules, className }, context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `export { default as styles } from './app.module.css'`,
          'app.module.css': animationCss,
        },
        options: {
          css: {
            modules,
            lightningcss: {
              cssModules: { animation: false, pattern: 'lightning_[local]' },
            },
          },
        },
      })

      expect(fileMap['style.css']).toContain('@keyframes fade-out')
      expect(fileMap['style.css']).toContain(`.${className}`)
      expect(fileMap['style.css']).not.toContain('lightning_')
      expect(fileMap['index.mjs']).toContain(`"${className}"`)
    },
  )

  test.for([
    { filename: 'app.css', modules: undefined },
    { filename: 'app.module.css', modules: false as const },
  ])(
    'does not scope $filename with modules=$modules',
    async ({ filename, modules }, context) => {
      const { fileMap } = await testBuild({
        context,
        files: {
          'index.ts': `import './${filename}'`,
          [filename]: animationCss,
        },
        options: {
          css: {
            modules,
            minify: true,
            lightningcss: {
              cssModules: { animation: false, pattern: 'scoped_[local]' },
            },
          },
        },
      })

      expect(fileMap['style.css']).toContain('.fade')
      expect(fileMap['style.css']).toContain('@keyframes fade-out')
      expect(fileMap['style.css']).not.toContain('scoped_')
    },
  )
})
