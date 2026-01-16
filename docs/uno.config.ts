import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
} from 'unocss'

export default defineConfig({
  presets: [presetWind3(), presetAttributify(), presetIcons()],
  content: {
    pipeline: {
      exclude: [
        /\.(css|postcss|sass|scss|less|stylus|styl)($|\?)/,
        /node_modules/,
      ],
    },
  },
})
