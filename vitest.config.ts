import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// No React plugin: all tests run in the Node environment and none render React
// components. Vitest transpiles TS natively. Dropping @vitejs/plugin-react also
// removes its vulnerable transitive vite@5 (dev-only) and shrinks the surface.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws when imported outside a Server Component. In the
      // Node test runner there is no client bundle, so stub it to a no-op.
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Firestore-rules emulator tests are opt-in (need the emulator running).
    exclude: process.env.RUN_EMULATOR_TESTS
      ? ['node_modules/**']
      : ['node_modules/**', 'src/**/*.emulator.test.ts'],
  },
});
