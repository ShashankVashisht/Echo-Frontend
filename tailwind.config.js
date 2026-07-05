/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        n: {
          bg:       '#191919',
          sidebar:  '#202020',
          hover:    '#2d2d2d',
          active:   '#373737',
          border:   '#333333',
          text:     '#e8e8e8',
          muted:    '#787878',
          blue:     '#2383e2',
          green:    '#0f9453',
          red:      '#eb5757',
          orange:   '#e9a94b',
          purple:   '#9b59b6',
          teal:     '#16a085',
        },
      },
      fontSize: {
        xs: ['11px', '14px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        lg:  ['16px', '22px'],
        xl:  ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['32px', '40px'],
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
