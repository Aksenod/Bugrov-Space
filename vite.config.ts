import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';
    
    return {
      base: '/',
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
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY)
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
