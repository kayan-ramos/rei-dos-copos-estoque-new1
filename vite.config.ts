import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['date-fns', 'xlsx']
        }
      }
    }
  },
  server: {
    host: true,
    port: parseInt(process.env.PORT || '8080'),
    strictPort: true
  },
  preview: {
    host: true,
    port: parseInt(process.env.PORT || '8080'),
    strictPort: true
  }
});