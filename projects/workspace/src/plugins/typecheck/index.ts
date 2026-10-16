import { dirname } from 'node:path';
import type { CreateNodes, CreateNodesResult, TargetConfiguration } from '@nx/devkit';
import { createNodesFromFiles } from '@nx/devkit';

function buildTypecheckTarget(configFilePath: string): CreateNodesResult {
  const projectRoot = dirname(configFilePath);

  const target: TargetConfiguration = {
    executor: 'nx:run-commands',
    cache: true,
    dependsOn: ['^build'],
    inputs: ['default', '^default', 'plugins'],
    outputs: [],
    options: {
      cwd: '{projectRoot}',
      command: 'tsc -p tsconfig.lib.json --noEmit',
      parallel: false,
      color: true,
    },
  };

  return {
    projects: {
      [projectRoot]: {
        targets: {
          typecheck: target,
        },
      },
    },
  };
}

export const createNodes: CreateNodes = [
  '**/tsconfig.lib.json',
  async (configFilePaths, options, context) => {
    return await createNodesFromFiles(buildTypecheckTarget, configFilePaths, options, context);
  },
];
