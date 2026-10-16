import { join } from 'node:path';
import type { Tree } from '@nx/devkit';
import { formatFiles, generateFiles, installPackagesTask, updateJson } from '@nx/devkit';
import type { GenerateLibGeneratorSchema } from './generate-lib.schema.js';

interface RootTsconfig {
  references?: { path: string }[];
}

export async function generateLibGenerator(tree: Tree, options: GenerateLibGeneratorSchema) {
  const { name, description = '' } = options;

  const projectRoot = join('projects', 'libs', name);

  generateFiles(tree, join(import.meta.dirname, 'files'), projectRoot, {
    name,
    description,
    projectRoot,
  });

  updateJson<RootTsconfig>(tree, 'tsconfig.json', (tsconfig) => {
    const references = tsconfig.references ?? [];
    const path = `./${projectRoot}`;

    if (!references.some((reference) => reference.path === path)) {
      references.push({ path });
    }

    return { ...tsconfig, references };
  });

  await formatFiles(tree);

  return () => installPackagesTask(tree, true);
}

export default generateLibGenerator;
