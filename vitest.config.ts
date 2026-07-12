import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@sms-backup-reader/lib': path.resolve(__dirname, './packages/lib/src')
    }
  }
});
