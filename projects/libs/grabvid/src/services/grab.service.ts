import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import type { GrabOptions } from '../schemas/grab-options.schema.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { defaultName, outputName } from '../utils/filename.util.js';
import { formatBytes } from '../utils/format.util.js';
import { resolveOutputPath } from '../utils/fs.util.js';
import { logger } from '../utils/logger.util.js';
import { preferredRendition } from '../utils/rendition.util.js';
import { isMp4, stripQuery } from '../utils/url.util.js';
import { downloadDirect } from './direct-download.service.js';
import { discoverRenditions } from './discovery.service.js';
import { downloadHls, openHls } from './hls.service.js';
import { reconcilePartial } from './partial-download.service.js';
import { resolveReferer } from './referer.service.js';
import { selectRendition } from './rendition-selection.service.js';
import { fallBackToYtDlp } from './yt-dlp.service.js';

export async function grab(options: GrabOptions, ctx: GrabContext): Promise<void> {
  try {
    await grabNative(options, ctx);
  } catch (err) {
    if (!options.fallback || !(err instanceof MediaUnavailableError)) {
      throw err;
    }
    await fallBackToYtDlp(options, ctx, err);
  }
}

async function grabNative(options: GrabOptions, ctx: GrabContext): Promise<void> {
  const { renditions, page, title } = await discoverRenditions(ctx, options.url);
  const referer = await resolveReferer(ctx, options.referer, preferredRendition(renditions, options.quality).url, page);
  const chosen = await selectRendition(ctx, 'media', renditions, referer, options);
  logger.found(`media: ${stripQuery(chosen.url)}`);
  const hls = isMp4(chosen.url) ? undefined : await openHls(ctx, chosen.url, referer, options);
  const fileName = outputName(title ?? defaultName(options.url), hls?.variant ?? chosen);
  const output = await resolveOutputPath(options.output, fileName);
  if (options.listFormats) {
    logger.info(`would save as: ${output}`);
    return;
  }

  logger.download(`Destination: ${output}`);
  await mkdir(path.dirname(output), { recursive: true });
  if (hls) {
    await downloadHls(ctx, hls, output, referer, options);
  } else {
    const source = await reconcilePartial(ctx, `${output}.part`, chosen, renditions, referer);
    await downloadDirect(ctx, source.url, output, referer);
  }

  const { size } = await stat(output);
  logger.done(`${output}  (${formatBytes(size)})`);
}
