import type { GrabOptions } from '../schemas/grab-options.schema.js';
import type { Rendition } from '../schemas/rendition.schema.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { logger } from '../utils/logger.util.js';
import { mapPool } from '../utils/map-pool.util.js';
import { describeRendition, preferredRendition } from '../utils/rendition.util.js';
import { isMp4 } from '../utils/url.util.js';
import { pathTail, printFormats } from '../views/formats-list.view.js';
import { pickQuality } from '../views/quality-picker.view.js';
import { headInfo } from './curl.service.js';

const HEAD_CONCURRENCY = 8;

async function withSizes(
  ctx: GrabContext,
  renditions: readonly Rendition[],
  referer: string | undefined,
): Promise<Rendition[]> {
  return mapPool(renditions, HEAD_CONCURRENCY, async (rendition) =>
    isMp4(rendition.url) ? { ...rendition, size: (await headInfo(ctx, rendition.url, referer)).total } : rendition,
  );
}

/** -F lists (marking the --quality pick), -i lets the user choose starting from it, otherwise --quality decides. */
export async function selectRendition(
  ctx: GrabContext,
  kind: string,
  candidates: readonly Rendition[],
  referer: string | undefined,
  opts: Pick<GrabOptions, 'quality' | 'interactive' | 'listFormats'>,
): Promise<Rendition> {
  const interactive = opts.interactive && candidates.length > 1;
  const renditions = opts.listFormats || interactive ? await withSizes(ctx, candidates, referer) : candidates;
  const preferred = preferredRendition(renditions, opts.quality);

  if (opts.listFormats) {
    printFormats(kind, renditions, preferred);
    return preferred;
  }
  if (interactive) {
    return pickQuality(renditions, preferred, (rendition, width) => pathTail(rendition.url, width), ctx.signal);
  }
  if (renditions.length > 1) {
    logger.found(
      `quality: ${describeRendition(preferred)} (available: ${renditions.map(describeRendition).join(', ')})`,
    );
  }
  return preferred;
}
