import { stat } from 'node:fs/promises';
import path from 'node:path';

export async function sizeOf(file: string): Promise<number> {
  return stat(file).then(
    (stats) => stats.size,
    () => 0,
  );
}

async function isDirectory(target: string): Promise<boolean> {
  return stat(target).then(
    (stats) => stats.isDirectory(),
    () => false,
  );
}

/** `-o` names the file, unless it is an existing directory or ends with a separator: the default name then goes inside it. */
export async function isDirectoryTarget(output: string): Promise<boolean> {
  return /[\\/]$/.test(output) || isDirectory(output);
}

export async function resolveOutputPath(output: string | undefined, fileName: string): Promise<string> {
  if (output === undefined) {
    return fileName;
  }
  return (await isDirectoryTarget(output)) ? path.join(output, fileName) : output;
}
