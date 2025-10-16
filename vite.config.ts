import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/' : '/',
  server: {
    port: 3000,
    strictPort: false,
    host: '0.0.0.0',
    hmr: {
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: [
      'ai-model-hub-8.preview.emergentagent.com',
      '.preview.emergentagent.com',
      'localhost',
    ],
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['./src/utils/csvParser', './src/utils/fuzzyMatcher'],
          components: ['./src/components/FileUpload', './src/components/MatchResults']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
}));