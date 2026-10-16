import type { Tree } from '@nx/devkit';
import { readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generateLibGenerator from './generate-lib.generator.js';

describe('generate-lib generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('tsconfig.json', JSON.stringify({ files: [], references: [] }));
  });

  it('should create a publishable package', async () => {
    await generateLibGenerator(tree, { name: 'demo', description: 'A demo package' });

    const packageJson = readJson(tree, 'projects/libs/demo/package.json');
    expect(packageJson.name).toBe('@ab-toolbox/demo');
    expect(packageJson.description).toBe('A demo package');
    expect(packageJson.private).toBeUndefined();
    expect(packageJson.repository.directory).toBe('projects/libs/demo');
    expect(tree.exists('projects/libs/demo/LICENSE')).toBe(true);
    expect(tree.exists('projects/libs/demo/src/index.ts')).toBe(true);
  });

  it('should add the package to the root tsconfig references once', async () => {
    await generateLibGenerator(tree, { name: 'demo' });
    await generateLibGenerator(tree, { name: 'demo' });

    const { references } = readJson(tree, 'tsconfig.json');
    expect(references).toEqual([{ path: './projects/libs/demo' }]);
  });
});
