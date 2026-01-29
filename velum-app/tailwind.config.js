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
        'notion-bg': '#ffffff',
        'notion-sidebar': '#f7f6f3',
        'notion-hover': '#ebebea',
        'notion-border': '#e3e2e0',
        'notion-text': '#37352f',
        'notion-text-light': '#9b9a97',
        'notion-accent': '#2eaadc',
      },
    },
  },
  plugins: [],
}
