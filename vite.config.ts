import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      tailwindcss(),
      react()
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            tanstack: ['@tanstack/react-query', '@tanstack/react-router'],
            radix: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-popover',
              '@radix-ui/react-accordion',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-label',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-separator',
              '@radix-ui/react-switch',
            ],
            quill: ['react-quill-new'],
            charts: ['recharts'],
          },
        },
      },
    },
    server: {
      proxy: {
        '/tenant': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    }
  }
})
