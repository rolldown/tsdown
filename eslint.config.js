// @ts-check
import { sxzz } from '@sxzz/eslint-config'

export default sxzz(
  {
    pnpm: true,
    baseline: {
      ignoreFeatures: ['explicit-resource-management', 'top-level-await'],
    },
  },
  {
    ignores: ['skills/**/*.md', 'reproduction/**'],
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
