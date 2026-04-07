import { getCompatibleVersions } from 'baseline-browser-mapping'

// Update on each major release
const targetDate = '2026-01-01'

// https://oxc.rs/docs/guide/usage/transformer/lowering#target
const baselineToOxcTargetMap: Record<string, string> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  safari_ios: 'ios',
}

const oxcSupportedBrowsers = new Set([
  'chrome',
  'edge',
  'firefox',
  'safari',
  'ios',
])

const results = getCompatibleVersions({
  widelyAvailableOnDate: targetDate,
})

const oxcTargets = results
  .map((target) => ({
    browser: baselineToOxcTargetMap[target.browser],
    version: target.version,
  }))
  .filter((target) => oxcSupportedBrowsers.has(target.browser))
  .map((target) => `${target.browser}${target.version}`)

console.log('Baseline Widely Available Targets:', oxcTargets)
