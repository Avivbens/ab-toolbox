import { relative, resolve } from 'node:path';
import type { InlineConfig } from 'vitest/node';

export const createVitestConfig = (projectPath: string, partialConfig: Partial<InlineConfig> = {}): InlineConfig => {
  const projectRelativePath = relative(import.meta.dirname, projectPath);

  return {
    ...partialConfig,
    name: projectRelativePath,
    globals: true,
    include: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: resolve(import.meta.dirname, 'coverage', projectRelativePath),
      reporter: [['json-summary', { file: `coverage.json` }]],
    },
    setupFiles: [partialConfig.setupFiles ?? []].flat(),
    passWithNoTests: true,
  };
};
