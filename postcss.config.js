// PostCSS configuration for Tailwind CSS v3 compatibility
// GOTCHA: This project uses Tailwind CSS v3, NOT v4
// - v4 uses '@tailwindcss/postcss' plugin which causes color utility issues
// - v3 uses 'tailwindcss' plugin directly for reliable shadcn/ui compatibility
module.exports = {
  plugins: {
    tailwindcss: {}, // v3 plugin - do NOT change to '@tailwindcss/postcss'
    autoprefixer: {},
  },
}