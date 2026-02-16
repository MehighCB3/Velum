/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'v-bg': '#faf8f5',
        'v-dark': '#1e1c19',
        'v-dark-inner': '#2a2825',
        'v-card': '#ffffff',
        'v-border': '#f0ece6',
        'v-border-subtle': '#f5f3ef',
        'v-accent': '#c4956a',
        'v-text': '#2d2a26',
        'v-text-secondary': '#b5b0a8',
        'v-text-muted': '#a09b93',
        'v-text-dark-muted': '#706b63',
        'v-success': '#6ec87a',
        'v-error': '#e85c5c',
        'v-protein': '#6ba3d6',
        'v-carbs': '#6ec87a',
        'v-fat': '#e8a85c',
        'v-purple': '#9b8ed6',
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
