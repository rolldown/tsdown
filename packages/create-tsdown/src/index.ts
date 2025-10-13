import process from 'node:process'
import { styleText } from 'node:util'
import {
  cancel,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts'
import { downloadTemplate } from 'giget'
import { getUserAgent } from 'package-manager-detector'

export interface Options {
  template?: 'default' | 'minimal' | 'vue' | 'react' | 'solid'
  path?: string
}

export type ResolvedOptions = Required<Options>

/**
 * Create a tsdown project.
 */
export async function create(
  path: string | undefined,
  options: Options,
): Promise<void> {
  intro(`Creating a tsdown project...`)

  const resolved = await resolveOptions({ ...options, path })

  const s = spinner()
  s.start('Cloning the template...')

  await downloadTemplate(`gh:sxzz/tsdown-templates/${resolved.template}`, {
    dir: resolved.path,
  })

  s.stop('Template cloned')

  const pm = getUserAgent() || 'npm'
  outro(
    `Done! Now run:\n` +
      `  ${styleText('green', `cd ${resolved.path}`)}\n` +
      `  ${styleText('green', `${pm} install`)}\n` +
      `  ${styleText('green', `${pm} run build`)}\n\n` +
      `For more information, visit: ${styleText('underline', `https://tsdown.dev/`)}`,
  )
}

/**
 * Resolve the user options and configs
 * @param options The user options
 * @returns The resolved options
 */
export async function resolveOptions(
  options: Options,
): Promise<ResolvedOptions> {
  let path: Options['path'] | symbol = options.path

  if (!path) {
    const defaultPath = './my-tsdown-package'
    path =
      (await text({
        message: 'What is the name of your package?',
        placeholder: defaultPath,
      })) || defaultPath
    if (isCancel(path)) {
      cancel('Operation cancelled.')
      process.exit(1)
    }
  }

  let template: Options['template'] | symbol = options.template
  if (template) {
    if (!['default', 'minimal', 'vue', 'react', 'solid'].includes(template)) {
      throw new Error(
        `Invalid template "${template}". Available templates: default, vue, react, solid`,
      )
    }
  } else {
    template = await select({
      message: 'Which template do you want to use?',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'minimal', label: 'Minimal' },
        { value: 'vue', label: 'Vue' },
        { value: 'react', label: 'React' },
        { value: 'solid', label: 'Solid' },
      ],
      initialValue: 'default',
    })

    if (isCancel(template)) {
      cancel('Operation cancelled.')
      process.exit(1)
    }
  }

  return {
    path,
    template,
  } satisfies ResolvedOptions
}
