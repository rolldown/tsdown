import { RequireCJS } from 'rolldown-plugin-require-cjs'
import { defineConfig } from './src/config.ts'

export default defineConfig([
  {
    entry: ['./src/{index,run,plugins,config}.ts'],
    name: 'tsdown',
    inlineOnly: ['is-in-ci'],
    platform: 'node',
    failOnWarn: 'ci-only',
    unused: {
      level: 'error',
      ignore: [
        'typescript', // Yarn PnP
      ],
    },
    publint: 'ci-only',
    attw: {
      enabled: 'ci-only',
      profile: 'esm-only',
    },
    exports: {
      customExports(exports) {
        exports['./client'] = './client.d.ts'
        return exports
      },
    },
    plugins: [RequireCJS()],
    onSuccess() {
      console.info('🙏 Build succeeded!')
    },
  },
  {
    workspace: {
      include: ['packages/*'],
    },
    inlineOnly: [],
    failOnWarn: 'ci-only',
    publint: 'ci-only',
    attw: {
      enabled: 'ci-only',
      profile: 'esm-only',
    },
    exports: true,
  },
])
