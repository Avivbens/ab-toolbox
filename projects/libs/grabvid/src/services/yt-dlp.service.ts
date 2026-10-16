import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { GrabError } from '../errors/grab.error.js';
import type { MediaUnavailableError } from '../errors/media-unavailable.error.js';
import type { GrabOptions } from '../schemas/grab-options.schema.js';
import { type YtDlpInfo, ytDlpInfoSchema } from '../schemas/yt-dlp-info.schema.js';
import type { GrabContext } from '../types/grab-context.types.js';
import type { YtDlpRendition } from '../types/yt-dlp.types.js';
import { errorMessage, interrupted } from '../utils/error.util.js';
import { isDirectoryTarget } from '../utils/fs.util.js';
import { logger } from '../utils/logger.util.js';
import { chooseRendition } from '../utils/rendition.util.js';
import { hasTool } from '../utils/require-tools.util.js';
import { toYtDlpRendition, ytDlpDownloadArgs, ytDlpInfoArgs } from '../utils/yt-dlp.util.js';
import { pickQuality } from '../views/quality-picker.view.js';

const YT_DLP = 'yt-dlp';
/** `-J` prints the whole info dict, which runs to megabytes on pages with many formats or subtitles. */
const INFO_MAX_BUFFER = 256 * 1024 * 1024;

async function fetchInfo(ctx: GrabContext, options: GrabOptions): Promise<YtDlpInfo> {
  let stdout: string;
  try {
    ({ stdout } = await promisify(execFile)(YT_DLP, ytDlpInfoArgs(options), {
      signal: ctx.signal,
      maxBuffer: INFO_MAX_BUFFER,
    }));
  } catch (err) {
    ctx.signal.throwIfAborted();
    const stderr = err instanceof Error && 'stderr' in err ? String(err.stderr).trim() : errorMessage(err);
    throw new GrabError(`yt-dlp could not read the page:\n${stderr}`);
  }
  try {
    return ytDlpInfoSchema.parse(JSON.parse(stdout));
  } catch (err) {
    throw new GrabError(`unexpected yt-dlp -J output: ${errorMessage(err)}`);
  }
}

async function pickFormat(ctx: GrabContext, options: GrabOptions): Promise<YtDlpRendition | undefined> {
  const { formats } = await fetchInfo(ctx, options);
  const renditions = (formats ?? []).filter((format) => format.vcodec !== 'none').map(toYtDlpRendition);
  const preferred = chooseRendition(renditions, options.quality);
  if (!preferred || renditions.length < 2) {
    return undefined;
  }
  return pickQuality(
    renditions,
    preferred,
    ({ format }) => `${format.format_id}${format.ext ? ` (${format.ext})` : ''}`,
    ctx.signal,
  );
}

async function runYtDlp(ctx: GrabContext, args: readonly string[]): Promise<void> {
  const child = spawn(YT_DLP, args, { stdio: 'inherit', signal: ctx.signal });
  const [exitCode, killedBy]: unknown[] = await once(child, 'close');
  ctx.signal.throwIfAborted();
  if (killedBy === 'SIGINT') {
    throw interrupted();
  }
  if (exitCode !== 0) {
    throw new GrabError(`yt-dlp failed too (exit ${String(exitCode)})`);
  }
}

export async function fallBackToYtDlp(
  options: GrabOptions,
  ctx: GrabContext,
  reason: MediaUnavailableError,
): Promise<void> {
  if (!(await hasTool(YT_DLP))) {
    throw new GrabError(`${reason.message}\n    Install yt-dlp and grabvid will fall back to it.`);
  }
  logger.warn(reason.message);
  logger.step('falling back to yt-dlp ...');
  const picked = options.interactive ? await pickFormat(ctx, options) : undefined;
  const toDirectory = options.output !== undefined && (await isDirectoryTarget(options.output));
  await runYtDlp(ctx, ytDlpDownloadArgs(options, toDirectory, picked));
}
