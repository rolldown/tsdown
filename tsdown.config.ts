import { RequireCJS } from 'rolldown-plugin-require-cjs'
import { defineConfig } from './src/config.ts'

export default defineConfig({
  entry: ['./src/{index,run,plugins,config}.ts'],
  inlineOnly: [],
  platform: 'node',
  dts: true,
  fixedExtension: true,
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
})
