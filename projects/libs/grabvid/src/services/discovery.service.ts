import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import { extractMediaUrls, extractNextPages, pageTitle } from '../parsers/html.parser.js';
import type { Rendition } from '../schemas/rendition.schema.js';
import type { Discovery } from '../types/discovery.types.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { logger } from '../utils/logger.util.js';
import { heightFromText } from '../utils/rendition.util.js';
import { isMediaUrl } from '../utils/url.util.js';
import { fetchText } from './curl.service.js';

const MAX_PAGE_DEPTH = 4;

async function discoverMedia(
  ctx: GrabContext,
  url: string,
  referer?: string,
  depth = MAX_PAGE_DEPTH,
  seen = new Set<string>(),
): Promise<Discovery | undefined> {
  if (depth < 0 || seen.has(url)) {
    return undefined;
  }
  seen.add(url);

  const { status, text: body } = await fetchText(ctx, url, referer);
  if (status !== 200 || !body) {
    return undefined;
  }

  const title = pageTitle(body);
  const candidates = extractMediaUrls(body, url);
  if (candidates.length > 0) {
    return { candidates, page: url, title };
  }

  for (const next of extractNextPages(body, url)) {
    const found = await discoverMedia(ctx, next, url, depth - 1, seen);
    if (found) {
      return { ...found, title: title ?? found.title };
    }
  }
  return undefined;
}

export async function discoverRenditions(
  ctx: GrabContext,
  url: string,
): Promise<Pick<Discovery, 'page' | 'title'> & { renditions: Rendition[] }> {
  let found: Discovery = { candidates: [url], page: url, title: undefined };
  if (!isMediaUrl(url)) {
    logger.step('scanning page (iframes + packed JS) for media ...');
    const discovery = await discoverMedia(ctx, url);
    if (!discovery) {
      throw new MediaUnavailableError('no .m3u8/.mp4 found on page (site may need a real browser / login)');
    }
    found = discovery;
  }
  const renditions = found.candidates.map((candidate): Rendition => ({
    url: candidate,
    height: heightFromText(new URL(candidate).pathname),
  }));
  return { renditions, page: found.page, title: found.title };
}
