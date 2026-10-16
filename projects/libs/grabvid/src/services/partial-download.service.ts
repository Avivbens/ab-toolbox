import { readFile, rm, writeFile } from 'node:fs/promises';
import { GrabError } from '../errors/grab.error.js';
import { type PartialSource, partialSourceSchema } from '../schemas/partial-source.schema.js';
import type { Rendition } from '../schemas/rendition.schema.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { sizeOf } from '../utils/fs.util.js';
import { logger } from '../utils/logger.util.js';
import { describeRendition } from '../utils/rendition.util.js';
import { stripQuery } from '../utils/url.util.js';
import { askAboutPartial } from '../views/partial-conflict.view.js';
import { headInfo } from './curl.service.js';

export function sidecarOf(part: string): string {
  return `${part}.json`;
}

async function loadPartialSource(part: string): Promise<PartialSource | undefined> {
  try {
    const parsed = partialSourceSchema.safeParse(JSON.parse(await readFile(sidecarOf(part), 'utf8')));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

async function describeSource(
  ctx: GrabContext,
  rendition: Rendition,
  referer: string | undefined,
): Promise<PartialSource> {
  const total = rendition.size ?? (await headInfo(ctx, rendition.url, referer)).total;
  return { url: stripQuery(rendition.url), height: rendition.height, total };
}

/** Sizes beat URLs when both are known: some CDNs rotate tokens inside the path itself. */
function sameSource(a: PartialSource, b: PartialSource): boolean {
  return a.total !== undefined && b.total !== undefined ? a.total === b.total : a.url === b.url;
}

/**
 * The .part is named after the page, not the quality, so a sidecar records which file it holds;
 * resuming it with a different file would silently splice two videos into one broken mp4.
 */
export async function reconcilePartial(
  ctx: GrabContext,
  part: string,
  chosen: Rendition,
  renditions: readonly Rendition[],
  referer: string | undefined,
): Promise<Rendition> {
  const selected = await describeSource(ctx, chosen, referer);
  const offset = await sizeOf(part);
  const stored = offset > 0 ? await loadPartialSource(part) : undefined;
  if (stored && sameSource(stored, selected)) {
    return chosen;
  }

  if (offset > 0) {
    const original = stored
      ? renditions.find(
          (r) =>
            r.url !== chosen.url &&
            (stripQuery(r.url) === stored.url || (r.height !== undefined && r.height === stored.height)),
        )
      : undefined;
    const choice = await askAboutPartial(
      { part, offset, stored, selected, canResume: original !== undefined },
      ctx.signal,
    );
    if (choice === 'resume' && original && stored) {
      if (!sameSource(stored, await describeSource(ctx, original, referer))) {
        throw new GrabError(`the original file changed on the server - delete ${part} to start over`);
      }
      logger.step(`resuming the original ${describeRendition(original)} download`);
      return original;
    }
    await rm(part, { force: true });
  }
  await writeFile(sidecarOf(part), JSON.stringify(selected));
  return chosen;
}
