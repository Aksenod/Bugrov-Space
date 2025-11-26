/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['SF Pro Display', 'Inter', 'sans-serif'],
      },
      colors: {
        glass: {
          100: 'rgba(255, 255, 255, 0.1)',
          200: 'rgba(255, 255, 255, 0.2)',
          300: 'rgba(255, 255, 255, 0.3)',
        }
      },
      animation: {
        'blob': 'blob 15s infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: 'none',
            '--tw-prose-body': 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-headings': 'rgba(255, 255, 255, 1)',
            '--tw-prose-lead': 'rgba(255, 255, 255, 0.8)',
            '--tw-prose-links': 'rgba(96, 165, 250, 1)',
            '--tw-prose-bold': 'rgba(255, 255, 255, 1)',
            '--tw-prose-counters': 'rgba(255, 255, 255, 0.7)',
            '--tw-prose-bullets': 'rgba(255, 255, 255, 0.6)',
            '--tw-prose-hr': 'rgba(255, 255, 255, 0.2)',
            '--tw-prose-quotes': 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-quote-borders': 'rgba(99, 102, 241, 0.5)',
            '--tw-prose-captions': 'rgba(255, 255, 255, 0.7)',
            '--tw-prose-code': 'rgba(251, 191, 36, 1)',
            '--tw-prose-pre-code': 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-pre-bg': 'rgba(30, 41, 59, 0.8)',
            '--tw-prose-th-borders': 'rgba(255, 255, 255, 0.2)',
            '--tw-prose-td-borders': 'rgba(255, 255, 255, 0.1)',
          },
        },
        invert: {
          css: {
            color: 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-body': 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-headings': 'rgba(255, 255, 255, 1)',
            '--tw-prose-lead': 'rgba(255, 255, 255, 0.8)',
            '--tw-prose-links': 'rgba(96, 165, 250, 1)',
            '--tw-prose-bold': 'rgba(255, 255, 255, 1)',
            '--tw-prose-counters': 'rgba(255, 255, 255, 0.7)',
            '--tw-prose-bullets': 'rgba(255, 255, 255, 0.6)',
            '--tw-prose-hr': 'rgba(255, 255, 255, 0.2)',
            '--tw-prose-quotes': 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-quote-borders': 'rgba(99, 102, 241, 0.5)',
            '--tw-prose-captions': 'rgba(255, 255, 255, 0.7)',
            '--tw-prose-code': 'rgba(251, 191, 36, 1)',
            '--tw-prose-pre-code': 'rgba(255, 255, 255, 0.9)',
            '--tw-prose-pre-bg': 'rgba(30, 41, 59, 0.8)',
            '--tw-prose-th-borders': 'rgba(255, 255, 255, 0.2)',
            '--tw-prose-td-borders': 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

