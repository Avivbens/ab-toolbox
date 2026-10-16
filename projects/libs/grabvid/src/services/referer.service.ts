import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { logger } from '../utils/logger.util.js';
import { isMp4 } from '../utils/url.util.js';
import { fetchText, headInfo } from './curl.service.js';

async function mediaReachable(ctx: GrabContext, media: string, referer: string | undefined): Promise<boolean> {
  if (isMp4(media)) {
    const { status } = await headInfo(ctx, media, referer);
    return status === 200 || status === 206;
  }
  const { status, text: body } = await fetchText(ctx, media, referer);
  return status === 200 && body.trimStart().startsWith('#EXTM3U');
}

/** No Referer goes first: KVS-style CDNs sign many tokens for a blank Referer. */
async function probeReferer(
  ctx: GrabContext,
  media: string,
  page: string,
): Promise<{ referer: string | undefined } | undefined> {
  const candidates = new Set([undefined, page, new URL(page).origin, new URL(media).origin]);
  for (const referer of candidates) {
    if (await mediaReachable(ctx, media, referer)) {
      return { referer };
    }
  }
  return undefined;
}

export async function resolveReferer(
  ctx: GrabContext,
  mode: string,
  media: string,
  page: string,
): Promise<string | undefined> {
  if (mode === 'none') {
    return undefined;
  }
  if (mode !== 'auto') {
    return mode;
  }
  const probe = await probeReferer(ctx, media, page);
  if (!probe) {
    throw new MediaUnavailableError(
      'no Referer worked (403/400/expired token). Open the page in your browser to mint a fresh token, or pass -r explicitly.',
    );
  }
  logger.found(`working referer: ${probe.referer ?? '<none>'}`);
  return probe.referer;
}
