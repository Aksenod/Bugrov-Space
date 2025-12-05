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
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
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
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
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
            // ============================================
            // ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ ВСЕХ СТИЛЕЙ ТИПОГРАФИКИ
            // Все изменения стилей текста делаются ТОЛЬКО здесь!
            // ============================================
            
            // CSS переменные для цветов
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
            
            // Параграфы - отступы между абзацами
            p: {
              marginTop: '0',
              marginBottom: '0.75rem', // Изменить здесь для изменения отступов между абзацами
              color: 'rgba(255, 255, 255, 0.95)',
              lineHeight: '1.75',
            },
            'p:last-child': {
              marginBottom: '0',
            },
            
            // Заголовки
            h1: {
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 1)',
              marginTop: '1rem',
              marginBottom: '0.75rem',
              lineHeight: '1.2',
            },
            'h1:first-child': {
              marginTop: '0',
            },
            h2: {
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 1)',
              marginTop: '1rem',
              marginBottom: '0.5rem',
              lineHeight: '1.3',
            },
            'h2:first-child': {
              marginTop: '0',
            },
            h3: {
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 1)',
              marginTop: '0.75rem',
              marginBottom: '0.5rem',
              lineHeight: '1.4',
            },
            'h3:first-child': {
              marginTop: '0',
            },
            
            // Списки
            ul: {
              listStyleType: 'disc',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              paddingLeft: '1.25rem',
              color: 'rgba(255, 255, 255, 0.95)',
            },
            ol: {
              listStyleType: 'decimal',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              paddingLeft: '1.25rem',
              color: 'rgba(255, 255, 255, 0.95)',
            },
            li: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            
            // Цитаты
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: 'rgba(99, 102, 241, 0.5)',
              paddingLeft: '1rem',
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
              fontStyle: 'italic',
              color: 'rgba(255, 255, 255, 0.9)',
            },
            
            // Ссылки
            a: {
              color: 'rgba(96, 165, 250, 1)',
              textDecoration: 'none',
            },
            'a:hover': {
              color: 'rgba(147, 197, 253, 1)',
              textDecoration: 'underline',
            },
            
            // Выделение текста
            strong: {
              fontWeight: '600',
              color: 'rgba(255, 255, 255, 1)',
            },
            em: {
              fontStyle: 'italic',
              color: 'rgba(255, 255, 255, 0.95)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

