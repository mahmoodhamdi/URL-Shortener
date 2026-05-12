import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/__tests__/unit/**/*.test.{ts,tsx}'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        '.next/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        'src/types/**',
        'src/messages/**',
        'src/i18n/**',
        'src/middleware.ts',
        'src/lib/**/index.ts',
        'src/app/**',
        'src/components/ui/**',
        'browser-extension/**',
        'docker/**',
        'prisma/**',
        'public/**',
        'src/lib/firebase/client.ts',
        'src/lib/firebase/messaging.ts',
        'src/lib/payment/providers/**/handlers.ts',
        'src/test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
