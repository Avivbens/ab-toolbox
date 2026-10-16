import { createWriteStream } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { GrabError } from '../errors/grab.error.js';
import { expectedSize } from '../parsers/http-head.parser.js';
import type { CurlResult } from '../types/curl.types.js';
import type { GrabContext } from '../types/grab-context.types.js';
import { isAbortError } from '../utils/error.util.js';
import { formatBytes } from '../utils/format.util.js';
import { sizeOf } from '../utils/fs.util.js';
import { logger } from '../utils/logger.util.js';
import { ProgressBar } from '../views/progress-bar.view.js';
import { curl, failureDetail } from './curl.service.js';
import { sidecarOf } from './partial-download.service.js';

/** curl's CURLE_RANGE_ERROR: the server ignored our Range header, so the .part cannot be resumed. */
const CURL_RANGE_ERROR = 33;

async function fetchToFile(
  ctx: GrabContext,
  url: string,
  file: string,
  referer: string | undefined,
  offset: number,
): Promise<CurlResult> {
  const bar = new ProgressBar(offset);
  let total: number | undefined;
  let received = 0;
  try {
    const res = await curl(ctx, {
      url,
      referer,
      args: ['--fail', ...(offset > 0 ? ['-C', String(offset)] : [])],
      sink: createWriteStream(file, { flags: offset > 0 ? 'a' : 'w' }),
      onHeaders: ({ status, headers }) => {
        total = expectedSize(status, headers) ?? total;
      },
      onData: (bytes) => {
        received += bytes;
        bar.update({ done: offset + received, total });
      },
    });
    if (res.exitCode === 0) {
      bar.finish();
    }
    return res;
  } catch (err) {
    bar.close();
    if (isAbortError(err)) {
      logger.warn(`partial download kept in ${file} - rerun the same command to resume`);
    }
    throw err;
  } finally {
    bar.close();
  }
}

export async function downloadDirect(
  ctx: GrabContext,
  url: string,
  dest: string,
  referer: string | undefined,
): Promise<void> {
  const part = `${dest}.part`;
  const offset = await sizeOf(part);
  if (offset > 0) {
    logger.step(`resuming ${part} at ${formatBytes(offset)}`);
  }
  const res = await fetchToFile(ctx, url, part, referer, offset);
  if (offset > 0 && res.exitCode === CURL_RANGE_ERROR) {
    logger.step('server cannot resume - starting over');
    await rm(part, { force: true });
    return downloadDirect(ctx, url, dest, referer);
  }
  /** curl reports 416 on a resumed request as success: the .part already holds the whole file. */
  const alreadyComplete = offset > 0 && res.status === 416;
  if (res.exitCode !== 0 || !(res.status === 200 || res.status === 206 || alreadyComplete)) {
    throw new GrabError(`download failed: ${failureDetail(res)}`);
  }
  await rename(part, dest);
  await rm(sidecarOf(part), { force: true });
}
