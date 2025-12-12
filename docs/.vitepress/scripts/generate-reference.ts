import { cp, rm } from 'node:fs/promises'
import { Application, type TypeDocOptions } from 'typedoc'

const LANGUAGES = ['zh-CN']
const tsconfig = '../tsconfig.json'

console.log('📚 Generating reference...')

// Generate API documentation
await runTypedoc(tsconfig)
console.log('✅ Reference generated successfully!')
console.log('📚 Beautifying reference structure...')

await rm('reference/api/index.md', { force: true })
await rm('reference/api/_media', { recursive: true, force: true })

for (const language of LANGUAGES) {
  await rm(`${language}/reference/api`, { recursive: true, force: true })
  await cp(`reference/api`, `${language}/reference/api`, {
    recursive: true,
    force: true,
  })
}

/**
 * Run TypeDoc with the specified tsconfig
 */
async function runTypedoc(tsconfig: string): Promise<void> {
  const options: TypeDocOptions &
    import('typedoc-plugin-markdown').PluginOptions = {
    tsconfig,
    plugin: ['typedoc-plugin-markdown', 'typedoc-vitepress-theme'],
    out: './reference/api',
    entryPoints: ['../src/index.ts'],
    excludeInternal: true,

    hideBreadcrumbs: true,
    useCodeBlocks: true,
    formatWithPrettier: true,
    flattenOutputFiles: true,

    // @ts-expect-error VitePress config
    docsRoot: './reference',
  }
  const app = await Application.bootstrapWithPlugins(options)

  // May be undefined if errors are encountered.
  const project = await app.convert()

  if (project) {
    // Generate configured outputs
    await app.generateOutputs(project)
  } else {
    throw new Error('Failed to generate TypeDoc output')
  }
}
