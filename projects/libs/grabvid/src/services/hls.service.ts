import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { TOOL_NAME } from '../constants/app.constants.js';
import { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import { parseMasterPlaylist, parseMediaPlaylist } from '../parsers/m3u8.parser.js';
import type { GrabOptions } from '../schemas/grab-options.schema.js';
import type { GrabContext } from '../types/grab-context.types.js';
import type { MediaPlaylist, Segment } from '../types/hls.types.js';
import { decryptAes128, sequenceIv } from '../utils/aes.util.js';
import { logger } from '../utils/logger.util.js';
import { mapPool } from '../utils/map-pool.util.js';
import { stripQuery } from '../utils/url.util.js';
import { ProgressBar } from '../views/progress-bar.view.js';
import { curl, failureDetail, fetchText } from './curl.service.js';
import { remux } from './ffmpeg.service.js';
import { selectRendition } from './rendition-selection.service.js';

const SEGMENT_ATTEMPTS = 3;

type KeyLoader = (uri: string) => Promise<Buffer>;

async function fetchPlaylist(ctx: GrabContext, url: string, referer: string | undefined): Promise<string> {
  const { status, text: playlist } = await fetchText(ctx, url, referer);
  if (status !== 200) {
    throw new MediaUnavailableError(`playlist fetch failed: HTTP ${status} for ${stripQuery(url)}`);
  }
  return playlist;
}

export async function openHls(
  ctx: GrabContext,
  url: string,
  referer: string | undefined,
  opts: Pick<GrabOptions, 'quality' | 'interactive' | 'listFormats'>,
): Promise<MediaPlaylist> {
  const playlist = await fetchPlaylist(ctx, url, referer);
  if (!playlist.includes('#EXT-X-STREAM-INF')) {
    return { url, text: playlist, variant: undefined };
  }
  const variants = parseMasterPlaylist(playlist, url);
  if (variants.length === 0) {
    throw new MediaUnavailableError('master playlist had no variants');
  }
  const chosen = await selectRendition(ctx, 'HLS variants', variants, referer, opts);
  logger.step(`selected variant: ${stripQuery(chosen.url)}`);
  return {
    url: chosen.url,
    text: opts.listFormats ? '' : await fetchPlaylist(ctx, chosen.url, referer),
    variant: chosen,
  };
}

async function fetchKey(ctx: GrabContext, uri: string, referer: string | undefined): Promise<Buffer> {
  const res = await curl(ctx, { url: uri, referer, args: ['--fail'] });
  if (res.status !== 200) {
    throw new MediaUnavailableError(`failed to fetch AES key ${uri}: ${failureDetail(res)}`);
  }
  if (res.body.length !== 16) {
    throw new MediaUnavailableError(`unexpected AES key length ${res.body.length} from ${uri}`);
  }
  return res.body;
}

/** Caches the promise, not the key, so parallel segments sharing a key trigger a single fetch. */
function keyLoader(ctx: GrabContext, referer: string | undefined): KeyLoader {
  const cache = new Map<string, Promise<Buffer>>();
  return (uri) => {
    let key = cache.get(uri);
    if (!key) {
      key = fetchKey(ctx, uri, referer);
      cache.set(uri, key);
    }
    return key;
  };
}

async function fetchSegment(
  ctx: GrabContext,
  segment: Segment,
  file: string,
  referer: string | undefined,
  loadKey: KeyLoader,
): Promise<number | undefined> {
  for (let attempt = 1; attempt <= SEGMENT_ATTEMPTS; attempt += 1) {
    const res = await curl(ctx, { url: segment.url, referer, args: ['--fail'] });
    if (res.exitCode === 0 && res.status === 200 && res.body.length > 0) {
      const data = segment.key
        ? decryptAes128(res.body, await loadKey(segment.key.uri), segment.key.iv ?? sequenceIv(segment.seq))
        : res.body;
      await writeFile(file, data);
      return data.length;
    }
  }
  return undefined;
}

async function fetchSegments(
  ctx: GrabContext,
  segments: readonly Segment[],
  workDir: string,
  referer: string | undefined,
  jobs: number,
): Promise<string[]> {
  const loadKey = keyLoader(ctx, referer);
  const bar = new ProgressBar();
  const failed: number[] = [];
  let fetched = 0;
  let bytes = 0;
  try {
    const files = await mapPool(segments, jobs, async (segment) => {
      const file = path.join(workDir, `seg-${String(segment.seq).padStart(6, '0')}.ts`);
      const size = await fetchSegment(ctx, segment, file, referer, loadKey);
      if (size === undefined) {
        failed.push(segment.seq);
      } else {
        fetched += 1;
        bytes += size;
      }
      bar.update({
        done: bytes,
        total: fetched > 0 ? (bytes / fetched) * segments.length : undefined,
        estimated: true,
        fragment: { done: fetched + failed.length, total: segments.length },
      });
      return file;
    });
    if (failed.length > 0) {
      const first = failed
        .toSorted((a, b) => a - b)
        .slice(0, 5)
        .join(', ');
      throw new MediaUnavailableError(
        `${failed.length} segment(s) failed to download (first: ${first}) - token may be IP-bound or expired`,
      );
    }
    bar.finish();
    return files;
  } finally {
    bar.close();
  }
}

export async function downloadHls(
  ctx: GrabContext,
  playlist: MediaPlaylist,
  dest: string,
  referer: string | undefined,
  opts: Pick<GrabOptions, 'jobs' | 'maxSegments'>,
): Promise<void> {
  const parsed = parseMediaPlaylist(playlist.text, playlist.url);
  const segments = opts.maxSegments > 0 ? parsed.segments.slice(0, opts.maxSegments) : parsed.segments;
  if (segments.length === 0) {
    throw new MediaUnavailableError('no segments found in media playlist');
  }
  const flags = `${segments.some((s) => s.key) ? ' (AES-128)' : ''}${parsed.initUrl ? ' (fMP4)' : ''}`;
  logger.step(`${segments.length} segments${flags}`);

  const workDir = await mkdtemp(path.join(tmpdir(), `${TOOL_NAME}-`));
  try {
    let init: Buffer | undefined;
    if (parsed.initUrl) {
      const res = await curl(ctx, { url: parsed.initUrl, referer, args: ['--fail'] });
      if (res.status !== 200) {
        throw new MediaUnavailableError(`failed to fetch fMP4 init segment: ${failureDetail(res)}`);
      }
      init = res.body;
    }
    const files = await fetchSegments(ctx, segments, workDir, referer, opts.jobs);

    const joined = path.join(workDir, 'joined.bin');
    await pipeline(async function* () {
      if (init) {
        yield init;
      }
      for (const file of files) {
        yield* createReadStream(file);
      }
    }, createWriteStream(joined));

    logger.step('remuxing to mp4 with ffmpeg ...');
    const part = `${dest}.part`;
    await remux(ctx, joined, part, init !== undefined);
    await rename(part, dest);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
