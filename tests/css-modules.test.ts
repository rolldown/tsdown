import path from 'node:path'
import { pathToFileURL } from 'node:url'
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

describe('css module composition', () => {
  const files = {
    'index.ts': `
      export { default as button, button as buttonClass } from './button.module.css'
      export { default as link, link as linkClass } from './link.module.css'
    `,
    'common.module.css': `
      .clickable {
        cursor: pointer;
        &:is(:disabled, [aria-disabled]) { cursor: not-allowed }
      }
      @media (hover: hover) {
        .clickable:hover { opacity: 0.5 }
      }
    `,
    'button.module.css': `
      .button {
        composes: clickable from './common.module.css';
        color: red;
      }
    `,
    'link.module.css': `
      .link {
        composes: clickable from './common.module.css';
        color: blue;
      }
    `,
  }

  test.for([
    { transformer: 'lightningcss' as const, splitting: false },
    { transformer: 'lightningcss' as const, splitting: true },
    { transformer: 'postcss' as const, splitting: false },
    { transformer: 'postcss' as const, splitting: true },
  ])(
    'emits shared styles once with $transformer and splitting=$splitting',
    async ({ transformer, splitting }, context) => {
      const { fileMap, outputDir } = await testBuild({
        context,
        files,
        options: {
          css: {
            transformer,
            splitting,
            modules: { generateScopedName: 'mod_[local]' },
          },
        },
      })

      const css = fileMap[splitting ? 'index.css' : 'style.css']
      expect(css.match(/cursor: pointer/g)).toHaveLength(1)
      expect(css.match(/cursor: not-allowed/g)).toHaveLength(1)
      expect(css.match(/@media/g)).toHaveLength(1)
      expect(css).toContain('.mod_button')
      expect(css).toContain('.mod_link')
      const exports = await import(
        pathToFileURL(path.join(outputDir, 'index.mjs')).href
      )
      expect(exports).toMatchObject({
        button: { button: 'mod_button mod_clickable' },
        link: { link: 'mod_link mod_clickable' },
        buttonClass: 'mod_button mod_clickable',
        linkClass: 'mod_link mod_clickable',
      })
    },
  )

  test.for([
    { transformer: 'lightningcss' as const },
    { transformer: 'postcss' as const },
  ])(
    'deduplicates minified nested styles with $transformer',
    async ({ transformer }, context) => {
      const { fileMap } = await testBuild({
        context,
        files,
        options: {
          css: {
            transformer,
            minify: true,
            modules: { generateScopedName: 'mod_[local]' },
          },
        },
      })
      expect(fileMap['style.css'].match(/cursor:pointer/g)).toHaveLength(1)
      expect(fileMap['style.css'].match(/cursor:not-allowed/g)).toHaveLength(1)
      expect(fileMap['style.css'].match(/@media/g)).toHaveLength(1)
    },
  )

  test('preserves the last duplicate and the first layer declaration', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        ...files,
        'common.module.css': `
          ${files['common.module.css']}
          @layer base { .layered { color: red } }
        `,
        'button.module.css': `
          ${files['button.module.css']}
          :global(.mod_clickable) { cursor: wait }
          @layer theme { .layered { color: blue } }
        `,
        'link.module.css': `
          ${files['link.module.css']}
          @media print { .clickable:hover { opacity: 0.5 } }
        `,
      },
      options: {
        css: { modules: { generateScopedName: 'mod_[local]' } },
      },
    })

    const css = fileMap['style.css']
    expect(css.match(/cursor: pointer/g)).toHaveLength(1)
    expect(css.indexOf('cursor: wait')).toBeLessThan(
      css.indexOf('cursor: pointer'),
    )
    expect(css.indexOf('@layer base')).toBeLessThan(css.indexOf('@layer theme'))
    expect(css).toContain('@media (hover: hover)')
    expect(css).toContain('@media print')
  })

  test('keeps shared composition styles in each async CSS asset', async (context) => {
    const { fileMap, outputDir } = await testBuild({
      context,
      files: {
        ...files,
        'index.ts': `
          export const button = () => import('./button.ts')
          export const link = () => import('./link.ts')
        `,
        'button.ts': `
          export { default as button } from './button.module.css'
          export { default as extra } from './button-extra.module.css'
        `,
        'link.ts': `
          export { default as link } from './link.module.css'
          export { default as extra } from './link-extra.module.css'
        `,
        'button-extra.module.css': `
          .buttonExtra { composes: clickable from './common.module.css'; color: green }
        `,
        'link-extra.module.css': `
          .linkExtra { composes: clickable from './common.module.css'; color: orange }
        `,
      },
      options: {
        css: {
          splitting: true,
          modules: { generateScopedName: 'mod_[local]' },
        },
      },
    })

    const assets = Object.entries(fileMap).filter(([name]) =>
      name.endsWith('.css'),
    )
    expect(assets).toHaveLength(2)
    for (const [, css] of assets) {
      expect(css.match(/cursor: pointer/g)).toHaveLength(1)
      expect(css.match(/cursor: not-allowed/g)).toHaveLength(1)
      expect(css.match(/@media/g)).toHaveLength(1)
    }
    const exports = await import(
      pathToFileURL(path.join(outputDir, 'index.mjs')).href
    )
    expect(await exports.button()).toMatchObject({
      button: { button: 'mod_button mod_clickable' },
      extra: { buttonExtra: 'mod_buttonExtra mod_clickable' },
    })
    expect(await exports.link()).toMatchObject({
      link: { link: 'mod_link mod_clickable' },
      extra: { linkExtra: 'mod_linkExtra mod_clickable' },
    })
  })

  test('does not reapply custom visitors when deduplicating unminified CSS', async (context) => {
    const { fileMap } = await testBuild({
      context,
      files: {
        ...files,
        'common.module.css': '.clickable { cursor: pointer }',
      },
      options: {
        css: {
          transformer: 'postcss',
          modules: { generateScopedName: 'mod_[local]' },
          lightningcss: {
            visitor: {
              Selector(selector) {
                return [
                  { type: 'type', name: 'section' },
                  { type: 'combinator', value: 'descendant' },
                  ...selector,
                ]
              },
            },
          },
        },
      },
    })

    const css = fileMap['style.css']
    expect(css.match(/cursor: pointer/g)).toHaveLength(1)
    expect(css).toContain('section .mod_button')
    expect(css).toContain('section .mod_link')
    expect(css).not.toContain('section section')
  })
})

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
