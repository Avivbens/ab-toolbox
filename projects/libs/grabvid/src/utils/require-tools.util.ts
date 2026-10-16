import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { GrabError } from '../errors/grab.error.js';

export async function hasTool(tool: string): Promise<boolean> {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  return Promise.any(dirs.map((dir) => access(path.join(dir, tool), constants.X_OK))).then(
    () => true,
    () => false,
  );
}

export async function requireTools(tools: readonly string[]): Promise<void> {
  for (const tool of tools) {
    if (!(await hasTool(tool))) {
      throw new GrabError(`required tool not found: ${tool}`);
    }
  }
}
