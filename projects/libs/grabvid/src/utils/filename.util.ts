import path from 'node:path';
import { TOOL_NAME } from '../constants/app.constants.js';
import type { RenditionQuality } from '../schemas/rendition.schema.js';
import { qualityLabel } from './rendition.util.js';

/** File names cap at 255 bytes (APFS, ext4); this leaves room for the tag, quality and `.part.json`. */
const MAX_TITLE_BYTES = 200;

/** The look-alike swaps yt-dlp makes, so titles keep their punctuation without creating subdirectories. */
const UNSAFE_FILENAME_CHARS: Readonly<Record<string, string>> = { '/': '⧸', '\\': '⧹', ':': '：' };

export function truncateUtf8(source: string, maxBytes: number): string {
  let bytes = 0;
  let end = 0;
  for (const char of source) {
    bytes += Buffer.byteLength(char);
    if (bytes > maxBytes) {
      return source.slice(0, end).trimEnd();
    }
    end += char.length;
  }
  return source;
}

export function outputName(title: string, rendition: RenditionQuality): string {
  const safeTitle = truncateUtf8(
    title
      .replace(/[/\\:]/g, (char) => UNSAFE_FILENAME_CHARS[char] ?? '_')
      .replace(/\p{Cc}/gu, '')
      .replace(/^\.+/, '')
      .trim(),
    MAX_TITLE_BYTES,
  );
  const quality = qualityLabel(rendition);
  return `[${TOOL_NAME}] ${safeTitle || 'video'}${quality ? ` | ${quality}` : ''}.mp4`;
}

export function defaultName(url: string): string {
  const name = path.posix
    .basename(new URL(url).pathname)
    .replace(/\.(?:m3u8|mp4|html?)$/i, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return name || 'video';
}
