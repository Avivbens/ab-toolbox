import { DEFAULT_UA, TOOL_NAME } from '../constants/app.constants.js';
import type { GrabOptions } from '../schemas/grab-options.schema.js';
import type { Quality } from '../schemas/quality.schema.js';
import type { YtDlpFormat } from '../schemas/yt-dlp-format.schema.js';
import type { YtDlpRendition } from '../types/yt-dlp.types.js';

/**
 * Close to grabvid's own `[grabvid] <title> | <quality>.mp4`, but with ` - `: yt-dlp ends the `&` replacement at the
 * first `|` and has no escape for it. The `&` form drops the quality when yt-dlp has no height.
 */
const OUTPUT_TEMPLATE = `[${TOOL_NAME}] %(title)s%(height& - {}p|)s.%(ext)s`;

export function toYtDlpRendition(format: YtDlpFormat): YtDlpRendition {
  return {
    format,
    height: format.height ?? undefined,
    bandwidth: typeof format.tbr === 'number' ? format.tbr * 1000 : undefined,
    size: format.filesize ?? format.filesize_approx ?? undefined,
    hasAudio: typeof format.acodec === 'string' && format.acodec !== 'none',
  };
}

/** yt-dlp's extractors choose their own headers, so only a Referer or User-Agent the user set is passed on. */
function requestArgs({ referer, ua }: Pick<GrabOptions, 'referer' | 'ua'>): string[] {
  return [
    ...(referer === 'auto' || referer === 'none' ? [] : ['--referer', referer]),
    ...(ua === DEFAULT_UA ? [] : ['--user-agent', ua]),
  ];
}

/** `-S res:N` takes the largest height at or under N, else the smallest above it: grabvid's own height-cap rule. */
function selectionArgs(quality: Quality, picked: YtDlpRendition | undefined): string[] {
  if (picked) {
    const id = picked.format.format_id;
    return ['-f', picked.hasAudio ? id : `${id}+ba/${id}`];
  }
  if (quality === 'best') {
    return [];
  }
  if (quality === 'worst') {
    return ['-f', 'wv*+wa/w'];
  }
  return ['-S', `res:${quality}`];
}

function outputArgs(output: string | undefined, toDirectory: boolean): string[] {
  if (output === undefined) {
    return ['-o', OUTPUT_TEMPLATE];
  }
  if (toDirectory) {
    return ['-P', output, '-o', OUTPUT_TEMPLATE];
  }
  // yt-dlp reads -o as a template, so a literal % must be doubled
  return ['-o', output.replaceAll('%', '%%')];
}

export function ytDlpInfoArgs(options: Pick<GrabOptions, 'url' | 'referer' | 'ua'>): string[] {
  return ['-J', '--no-warnings', ...requestArgs(options), '--', options.url];
}

export function ytDlpDownloadArgs(options: GrabOptions, toDirectory: boolean, picked?: YtDlpRendition): string[] {
  const download = options.listFormats
    ? ['-F']
    : [
        ...selectionArgs(options.quality, picked),
        ...outputArgs(options.output, toDirectory),
        '--merge-output-format',
        'mp4',
        '-N',
        String(options.jobs),
      ];
  return [...download, ...requestArgs(options), '--', options.url];
}
