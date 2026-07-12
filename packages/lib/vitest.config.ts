import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    alias: {
      '@sms-backup-reader/lib': path.resolve(__dirname, './src')
    }
  }
});
