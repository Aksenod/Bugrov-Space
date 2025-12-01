import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';

    // Trigger workflow
    // Support dynamic base path for PR previews
    // Use process.env to read environment variables from GitHub Actions
    const basePath = process.env.VITE_BASE_PATH || '/'

    // Generate build timestamp for cache busting
    const buildTimestamp = Date.now();

    return {
      base: basePath,
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Оптимизация для dev-режима
        hmr: {
          overlay: true,
        },
        // Увеличиваем таймауты для больших проектов
        watch: {
          usePolling: false,
          interval: 100,
        },
      },
      plugins: [
        react(),
        {
          name: 'html-transform',
          transformIndexHtml(html) {
            // Add version meta tag with timestamp for cache busting
            return html.replace(
              '<meta http-equiv="Expires" content="0" />',
              `<meta http-equiv="Expires" content="0" />\n    <meta name="version" content="${buildTimestamp}" />`
            );
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        '__BUILD_TIMESTAMP__': JSON.stringify(buildTimestamp)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        // Предварительная оптимизация тяжелых зависимостей
        include: [
          'react',
          'react-dom',
          'lucide-react',
          'react-markdown',
          'remark-gfm',
        ],
        // Исключаем проблемные зависимости из оптимизации (если нужно)
        exclude: [],
        // Увеличиваем лимит для больших зависимостей
        esbuildOptions: {
          target: 'esnext',
        },
      },
      build: {
        // Оптимизация для продакшена
        target: 'esnext',
        minify: 'esbuild',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              // Выделяем тяжелые библиотеки в отдельные чанки
              'react-vendor': ['react', 'react-dom'],
              'markdown-vendor': ['react-markdown', 'remark-gfm'],
              'syntax-highlighter': ['react-syntax-highlighter'],
            },
          },
        },
      },
      // Ускоряем dev-сборку
      esbuild: {
        target: 'esnext',
      },
    };
});

