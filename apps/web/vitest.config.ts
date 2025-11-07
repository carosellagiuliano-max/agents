import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@schnittwerk/lib': path.resolve(currentDir, '../../packages/lib/src'),
      '@schnittwerk/ui': path.resolve(currentDir, '../../packages/ui/src'),
      '@schnittwerk/db': path.resolve(currentDir, '../../packages/db/src'),
      '@schnittwerk/payments': path.resolve(currentDir, '../../packages/payments/src'),
      '@': path.resolve(currentDir, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    globals: true,
  },
});
