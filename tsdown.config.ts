import { DtsSnapshot } from 'rolldown-plugin-dts-snapshot'
import { RequireCJS } from 'rolldown-plugin-require-cjs'
import { isCallOf } from 'unplugin-ast/ast-kit'
import AST from 'unplugin-ast/rolldown'
import { RemoveNode } from 'unplugin-ast/transformers'
import { defineConfig } from './src/config.ts'

export default defineConfig([
  {
    entry: ['./src/{index,run,plugins,config}.ts'],
    name: 'tsdown',
    inlineOnly: [
      '@publint/pack',
      'is-in-ci',
      'package-manager-detector',
      'pkg-types', // type-only
    ],
    platform: 'node',
    failOnWarn: 'ci-only',
    define: {
      'import.meta.TSDOWN_PRODUCTION': 'true',
    },
    dts: true,
    unused: {
      level: 'error',
      ignore: [
        'typescript', // Yarn PnP
      ],
    },
    treeshake: {
      moduleSideEffects: false,
    },
    publint: 'ci-only',
    attw: {
      enabled: 'ci-only',
      profile: 'esm-only',
    },
    exports: {
      customExports: {
        './client': './client.d.ts',
      },
    },
    plugins: [
      RequireCJS(),
      DtsSnapshot(),
      AST({
        exclude: ['**/*.d.ts'],
        transformer: [RemoveNode((node) => isCallOf(node, 'typeAssert'))],
      }),
    ],
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
    treeshake: {
      moduleSideEffects: false,
    },
    exports: true,
  },
])
