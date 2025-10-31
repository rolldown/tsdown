import { RequireCJS } from 'rolldown-plugin-require-cjs'
import { defineConfig } from './src/config.ts'

export default defineConfig([
  {
    entry: ['./src/{index,run,plugins,config}.ts'],
    name: 'tsdown',
    inlineOnly: [],
    platform: 'node',
    unused: {
      level: 'error',
      ignore: [
        'typescript', // Yarn PnP
      ],
    },
    publint: true,
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
    inputOptions: {
      debug: {},
    },
  },
  {
    workspace: {
      include: ['packages/*'],
    },
    inlineOnly: [],
    publint: true,
    exports: true,
  },
])
