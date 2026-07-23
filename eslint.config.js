// @ts-check
import { sxzz } from '@sxzz/eslint-config'

export default sxzz(
  {
    vue: true,
    pnpm: true,
    baseline: {
      ignoreFeatures: [
        'explicit-resource-management',
        'top-level-await',
        'promise-withresolvers',
      ],
    },
  },
  {
    ignores: ['skills/**/*.md', 'reproduction/**', '__snapshots__'],
  },
  {
    files: ['templates/**'],
    rules: {
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    files: ['docs/**/*.md/**'],
    rules: {
      'unicorn/prefer-node-protocol': 'off',
    },
  },
)
