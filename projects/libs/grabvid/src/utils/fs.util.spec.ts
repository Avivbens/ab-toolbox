import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveOutputPath } from './fs.util.js';

const FILE_NAME = '[grabvid] Clip | 720p.mp4';

describe('resolveOutputPath', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'grabvid-spec-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('uses the default name without -o', async () => {
    await expect(resolveOutputPath(undefined, FILE_NAME)).resolves.toBe(FILE_NAME);
  });

  it('saves the default name inside an existing directory', async () => {
    await expect(resolveOutputPath(dir, FILE_NAME)).resolves.toBe(path.join(dir, FILE_NAME));
  });

  it('treats a trailing separator as a directory, even one that does not exist yet', async () => {
    const target = `${path.join(dir, 'new', 'videos')}/`;
    await expect(resolveOutputPath(target, FILE_NAME)).resolves.toBe(path.join(dir, 'new', 'videos', FILE_NAME));
  });

  it('keeps an explicit file path, new or existing', async () => {
    const existing = path.join(dir, 'existing.mp4');
    await writeFile(existing, '');

    await expect(resolveOutputPath(existing, FILE_NAME)).resolves.toBe(existing);
    await expect(resolveOutputPath(path.join(dir, 'new.mp4'), FILE_NAME)).resolves.toBe(path.join(dir, 'new.mp4'));
  });
});
