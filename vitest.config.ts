import { defineConfig } from 'vitest/config';

// The tested modules (core/*, google-domains) are pure: no network, no DOM, no WXT
// auto-imports — the deterministic suite runs in plain Node.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
