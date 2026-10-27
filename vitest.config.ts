import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

const reportsDirectory = process.env['TEST_UNDECLARED_OUTPUTS_DIR'] ?? 'build';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
    mockReset: true,
    unstubEnvs: true,
    unstubGlobals: true,
    passWithNoTests: false,
    reporters: ['default', 'junit'],
    outputFile: { junit: join(reportsDirectory, 'test-results/junit.xml') },
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
      reportsDirectory: join(reportsDirectory, 'coverage'),
      reporter: ['text', 'html', 'lcov'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
