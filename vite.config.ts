import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: '/sms-backup-reader-2/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sms-backup-reader/lib': path.resolve(__dirname, './packages/lib/src')
    }
  },
  server: {
    port: 3000
  },
  preview: {
    port: 3000,
    host: '127.0.0.1'
  }
});
