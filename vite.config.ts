import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Yirik kutubxonalarni alohida chunk'lar qilamiz — brauzer keshlaydi, qayta yuklamaydi
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'motion': ['framer-motion'],
          'xlsx': ['xlsx'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
});
