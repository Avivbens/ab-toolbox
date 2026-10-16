import { defineConfig } from 'vitest/config';
import { createVitestConfig } from '../../../vitest-base';

export default defineConfig({
  root: import.meta.dirname,
  test: createVitestConfig(import.meta.dirname),
});
